import { Channel, Presence } from "phoenix";
import { getSocket, connectSocket } from "./socket";

export type GamePlayer = {
  id: string;
  name: string;
};

export type GameCallbacks = {
  onPlayersChanged: (players: GamePlayer[]) => void;
  onPositionUpdate: (playerId: string, progress: number) => void;
  onGameStarted: () => void;
  onGameEnded?: () => void;
};

let gameChannel: Channel | null = null;
let gamePresence: Presence | null = null;
let lastSendTime = 0;

const SEND_INTERVAL = 100; // ~10Hz

function collectPlayers(presence: Presence): GamePlayer[] {
  const players: GamePlayer[] = [];
  presence.list((id: string, p: { metas: Array<{ player_name?: string }> }) => {
    players.push({ id, name: p.metas[0]?.player_name ?? id });
  });
  return players;
}

const READY_TIMEOUT = 5000;

export function joinGame(
  gameId: string,
  playerName: string,
  existingPlayerId: string | undefined,
  expectedPlayers: number,
  callbacks: GameCallbacks,
): Promise<{ players: GamePlayer[] }> {
  if (!getSocket()) {
    connectSocket(playerName, existingPlayerId);
  }

  const socket = getSocket()!;
  gameChannel = socket.channel(`game:${gameId}`, {});
  gamePresence = new Presence(gameChannel);

  return new Promise((resolve, reject) => {
    let resolved = false;

    const doResolve = (players: GamePlayer[]) => {
      if (resolved) return;
      resolved = true;
      resolve({ players });
    };

    // Timeout: resolve with whatever players are present
    const timer = setTimeout(() => {
      if (!gamePresence) return;
      doResolve(collectPlayers(gamePresence));
    }, READY_TIMEOUT);

    gamePresence!.onSync(() => {
      if (!gamePresence) return;
      const players = collectPlayers(gamePresence);
      callbacks.onPlayersChanged(players);
      // Wait until all expected players have joined
      if (players.length >= expectedPlayers) {
        clearTimeout(timer);
        doResolve(players);
      }
    });

    gameChannel!.on("position_update", (payload: { player_id: string; progress: number }) => {
      callbacks.onPositionUpdate(payload.player_id, payload.progress);
    });

    gameChannel!.on("game_started", () => {
      callbacks.onGameStarted();
    });

    gameChannel!.on("game_ended", () => {
      callbacks.onGameEnded?.();
    });

    gameChannel!
      .join()
      .receive("ok", () => {
        // resolve happens on first presence sync
      })
      .receive("error", (resp: unknown) => reject(new Error(JSON.stringify(resp))));
  });
}

export function startGame(): void {
  gameChannel?.push("start_game", {});
}

export function sendPositionUpdate(progress: number): void {
  const now = Date.now();
  if (now - lastSendTime < SEND_INTERVAL) return;
  lastSendTime = now;
  gameChannel?.push("position_update", { progress });
}

export function leaveGame(): void {
  gameChannel?.leave();
  gameChannel = null;
  gamePresence = null;
  lastSendTime = 0;
}

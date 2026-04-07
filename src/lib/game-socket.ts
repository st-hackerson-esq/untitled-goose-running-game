import { Channel, Presence } from "phoenix";
import { getSocket } from "./socket";

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

// Module-level callbacks so we can rebind them across the Lobby → Startup
// handoff without recreating the channel (which would race against Lobby's
// leave on the same singleton).
let cbPlayersChanged: GameCallbacks["onPlayersChanged"] | null = null;
let cbPositionUpdate: GameCallbacks["onPositionUpdate"] | null = null;
let cbGameStarted: GameCallbacks["onGameStarted"] | null = null;
let cbGameEnded: GameCallbacks["onGameEnded"] | null = null;

const SEND_INTERVAL = 100; // ~10Hz
const READY_TIMEOUT = 5000;

function collectPlayers(presence: Presence): GamePlayer[] {
  const players: GamePlayer[] = [];
  presence.list((id: string, p: { metas: Array<{ player_name?: string }> }) => {
    players.push({ id, name: p.metas[0]?.player_name ?? id });
  });
  return players;
}

export function joinGame(
  gameId: string,
  playerName: string,
  _existingPlayerId: string | undefined,
  expectedPlayers: number,
  callbacks: GameCallbacks,
): Promise<{ players: GamePlayer[] }> {
  // Always update the active callbacks. Channel handlers below dispatch
  // through these module variables so they pick up the latest functions.
  cbPlayersChanged = callbacks.onPlayersChanged;
  cbPositionUpdate = callbacks.onPositionUpdate;
  cbGameStarted = callbacks.onGameStarted;
  cbGameEnded = callbacks.onGameEnded ?? null;

  // If we're already joined to this exact game, the Lobby waiting room
  // already established the channel — Startup just needs to rebind. Resolve
  // immediately with the current presence snapshot.
  if (
    gameChannel &&
    gameChannel.topic === `game:${gameId}` &&
    gameChannel.isJoined() &&
    gamePresence
  ) {
    const players = collectPlayers(gamePresence);
    cbPlayersChanged(players);
    return Promise.resolve({ players });
  }

  const socket = getSocket();
  if (!socket) {
    return Promise.reject(new Error("socket not initialized"));
  }

  // Switching games (or first join after a fresh socket): leave any prior
  // channel and create a new one.
  if (gameChannel) {
    gameChannel.leave();
    gameChannel = null;
    gamePresence = null;
  }

  const channel = socket.channel(`game:${gameId}`, { player_name: playerName });
  const presence = new Presence(channel);
  gameChannel = channel;
  gamePresence = presence;

  return new Promise((resolve, reject) => {
    let resolved = false;

    const doResolve = (players: GamePlayer[]) => {
      if (resolved) return;
      resolved = true;
      resolve({ players });
    };

    const timer = setTimeout(() => {
      if (!gamePresence) return;
      doResolve(collectPlayers(gamePresence));
    }, READY_TIMEOUT);

    presence.onSync(() => {
      if (!gamePresence) return;
      const players = collectPlayers(gamePresence);
      cbPlayersChanged?.(players);
      if (players.length >= expectedPlayers) {
        clearTimeout(timer);
        doResolve(players);
      }
    });

    channel.on("position_update", (payload: { player_id: string; progress: number }) => {
      cbPositionUpdate?.(payload.player_id, payload.progress);
    });

    channel.on("game_started", () => {
      cbGameStarted?.();
    });

    channel.on("game_ended", () => {
      cbGameEnded?.();
    });

    channel
      .join()
      .receive("ok", () => {
        // resolve happens on first presence sync
      })
      .receive("error", (resp: unknown) => {
        clearTimeout(timer);
        // Halt Phoenix's auto-rejoin timer for refused entries (e.g.
        // "game_not_open"). Without this the channel keeps retrying.
        channel.leave();
        if (gameChannel === channel) {
          gameChannel = null;
          gamePresence = null;
        }
        reject(new Error(JSON.stringify(resp)));
      });
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
  cbPlayersChanged = null;
  cbPositionUpdate = null;
  cbGameStarted = null;
  cbGameEnded = null;
}

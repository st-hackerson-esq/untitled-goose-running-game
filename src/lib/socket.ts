import { Socket, Presence, Channel } from "phoenix";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:4000/socket";

let socket: Socket | null = null;
let playerId: string | null = null;
let lobbyChannel: Channel | null = null;
let lobbyPresence: Presence | null = null;

export type LobbyPlayer = {
  id: string;
  name: string;
  joinedAt: number;
};

export type GameInfo = {
  id: string;
  name: string;
  creator_id: string;
  created_at: string;
};

export function connectSocket(playerName: string, existingPlayerId?: string) {
  if (socket) return;
  playerId = existingPlayerId ?? `${playerName}-${Date.now().toString(36)}`;
  socket = new Socket(SOCKET_URL, {
    params: { player_id: playerId, player_name: playerName },
  });
  socket.connect();
}

export function getSocket(): Socket | null {
  return socket;
}

export function getPlayerId(): string | null {
  return playerId;
}

export function connectToLobby(
  playerName: string,
  onPlayersChanged: (players: LobbyPlayer[]) => void,
) {
  connectSocket(playerName);

  lobbyChannel = socket!.channel("lobby", {});
  lobbyPresence = new Presence(lobbyChannel);

  lobbyPresence.onSync(() => {
    const players: LobbyPlayer[] = [];
    lobbyPresence!.list((id: string, presence: { metas: Array<{ player_name?: string; joined_at?: number }> }) => {
      const meta = presence.metas[0];
      players.push({
        id,
        name: meta?.player_name ?? id,
        joinedAt: meta?.joined_at ?? 0,
      });
    });
    onPlayersChanged(players);
  });

  return new Promise<void>((resolve, reject) => {
    lobbyChannel!
      .join()
      .receive("ok", () => resolve())
      .receive("error", (resp: unknown) => reject(new Error(JSON.stringify(resp))));
  });
}

export function createGame(name: string): Promise<GameInfo> {
  return new Promise((resolve, reject) => {
    lobbyChannel!
      .push("create_game", { name })
      .receive("ok", (game: GameInfo) => resolve(game))
      .receive("error", (resp: unknown) => reject(new Error(JSON.stringify(resp))));
  });
}

export function listGames(): Promise<GameInfo[]> {
  return new Promise((resolve, reject) => {
    lobbyChannel!
      .push("list_games", {})
      .receive("ok", (resp: { games: GameInfo[] }) => resolve(resp.games))
      .receive("error", (resp: unknown) => reject(new Error(JSON.stringify(resp))));
  });
}

export function onGameCreated(callback: (game: GameInfo) => void): void {
  lobbyChannel?.on("game_created", callback);
}

export function offGameCreated(): void {
  lobbyChannel?.off("game_created");
}

export function disconnectSocket() {
  lobbyChannel?.leave();
  socket?.disconnect();
  lobbyChannel = null;
  lobbyPresence = null;
  socket = null;
  playerId = null;
}

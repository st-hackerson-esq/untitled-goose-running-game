import { Socket, Presence, Channel } from "phoenix";

let socket: Socket | null = null;
let playerId: string | null = null;
let lobbyChannel: Channel | null = null;
let lobbyPresence: Presence | null = null;
let lobbyJoinedName: string | null = null;

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

/**
 * Wires the socket singleton with an instance owned by the SocketProvider.
 * The provider is the only writer; everything else just calls the helpers
 * below, which read this singleton via getSocket().
 */
export function setSocketInstance(instance: Socket | null, id: string | null) {
  socket = instance;
  playerId = id;
  // A new (or torn-down) socket invalidates any existing channel state.
  lobbyChannel = null;
  lobbyPresence = null;
  lobbyJoinedName = null;
}

export function getSocket(): Socket | null {
  return socket;
}

export function getPlayerId(): string | null {
  return playerId;
}

export function joinLobbyChannel(
  playerName: string,
  onPlayersChanged: (players: LobbyPlayer[]) => void,
): Promise<void> {
  if (!socket) {
    return Promise.reject(new Error("socket not initialized"));
  }

  // Idempotent: if we're already joined to the lobby with the same name,
  // just rebind the players callback and resolve. This handles Lobby
  // remounts (e.g. after a game ends) without leaving and rejoining.
  if (lobbyChannel && lobbyJoinedName === playerName && lobbyChannel.isJoined()) {
    bindLobbyPresence(onPlayersChanged);
    if (lobbyPresence) {
      onPlayersChanged(collectLobbyPlayers(lobbyPresence));
    }
    return Promise.resolve();
  }

  // Switching to a different name (or first join): drop any prior channel.
  if (lobbyChannel) {
    lobbyChannel.leave();
    lobbyChannel = null;
    lobbyPresence = null;
    lobbyJoinedName = null;
  }

  const channel = socket.channel("lobby", { player_name: playerName });
  const presence = new Presence(channel);
  lobbyChannel = channel;
  lobbyPresence = presence;
  bindLobbyPresence(onPlayersChanged);

  return new Promise<void>((resolve, reject) => {
    channel
      .join()
      .receive("ok", () => {
        lobbyJoinedName = playerName;
        resolve();
      })
      .receive("error", (resp: unknown) => {
        // Halt Phoenix's auto-rejoin timer for refused entries — without
        // this, a name_taken (or any other refusal) would loop forever.
        channel.leave();
        if (lobbyChannel === channel) {
          lobbyChannel = null;
          lobbyPresence = null;
          lobbyJoinedName = null;
        }
        reject(new Error(JSON.stringify(resp)));
      });
  });
}

function bindLobbyPresence(onPlayersChanged: (players: LobbyPlayer[]) => void) {
  if (!lobbyPresence) return;
  lobbyPresence.onSync(() => {
    if (!lobbyPresence) return;
    onPlayersChanged(collectLobbyPlayers(lobbyPresence));
  });
}

function collectLobbyPlayers(presence: Presence): LobbyPlayer[] {
  const players: LobbyPlayer[] = [];
  presence.list((id: string, p: { metas: Array<{ player_name?: string; joined_at?: number }> }) => {
    const meta = p.metas[0];
    players.push({
      id,
      name: meta?.player_name ?? id,
      joinedAt: meta?.joined_at ?? 0,
    });
  });
  return players;
}

export function leaveLobbyChannel(): void {
  lobbyChannel?.leave();
  lobbyChannel = null;
  lobbyPresence = null;
  lobbyJoinedName = null;
}

export function createGame(name: string): Promise<GameInfo> {
  return new Promise((resolve, reject) => {
    if (!lobbyChannel) {
      reject(new Error("not in lobby"));
      return;
    }
    lobbyChannel
      .push("create_game", { name })
      .receive("ok", (game: GameInfo) => resolve(game))
      .receive("error", (resp: unknown) => reject(new Error(JSON.stringify(resp))));
  });
}

export function listGames(): Promise<GameInfo[]> {
  return new Promise((resolve, reject) => {
    if (!lobbyChannel) {
      reject(new Error("not in lobby"));
      return;
    }
    lobbyChannel
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

export function onGameDeleted(callback: (payload: { id: string }) => void): void {
  lobbyChannel?.on("game_deleted", callback);
}

export function offGameDeleted(): void {
  lobbyChannel?.off("game_deleted");
}

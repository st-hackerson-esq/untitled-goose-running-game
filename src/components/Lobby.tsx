import { useState, useEffect, useCallback, useRef } from "react";
import {
  joinLobbyChannel,
  leaveLobbyChannel,
  createGame,
  listGames,
  onGameCreated,
  offGameCreated,
  onGameDeleted,
  offGameDeleted,
  type LobbyPlayer,
  type GameInfo,
} from "@/lib/socket";
import {
  joinGame,
  startGame,
  leaveGame,
  type GamePlayer,
} from "@/lib/game-socket";
import { useConnection } from "@/lib/socket-provider";

const GOOSE_EMOJIS = ["🪿", "🦆", "🐥", "🥚", "🐣", "🦢"];

function pickEmoji(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GOOSE_EMOJIS[Math.abs(hash) % GOOSE_EMOJIS.length];
}

type GameParams = {
  playerName: string;
  gameId: string;
  playerId: string;
  playerCount: number;
};

export function Lobby({ onStartGame }: { onStartGame: (params: GameParams) => void }) {
  const { playerId, playerName, setPlayerName } = useConnection();

  const [name, setName] = useState(playerName ?? "");
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const gamePlayersRef = useRef<GamePlayer[]>([]);

  // Auto-join the lobby channel when we have a player name. Idempotent on
  // the lib side, so this safely re-runs after Lobby remounts (e.g. coming
  // back from a finished game) without re-joining.
  useEffect(() => {
    if (!playerName) {
      inputRef.current?.focus();
      return;
    }

    let cancelled = false;
    setConnecting(true);
    setError("");

    (async () => {
      try {
        await joinLobbyChannel(playerName, setPlayers);
        if (cancelled) return;

        const existingGames = await listGames();
        if (cancelled) return;
        setGames(existingGames);

        onGameCreated((game) => {
          setGames((prev) => (prev.some((g) => g.id === game.id) ? prev : [...prev, game]));
        });

        onGameDeleted((payload) => {
          setGames((prev) => prev.filter((g) => g.id !== payload.id));
        });
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("name_taken")) {
          setError("That name is already taken. Please choose another.");
          // Bug 1: bounce back to the name input on refused entry.
          setPlayerName(null);
          setName("");
        } else {
          setError("Could not join the lobby.");
          console.error(err);
        }
      } finally {
        if (!cancelled) setConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
      offGameCreated();
      offGameDeleted();
    };
  }, [playerName, setPlayerName]);

  const handleJoin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed || connecting) return;
      setError("");
      setPlayerName(trimmed);
    },
    [name, connecting, setPlayerName],
  );

  const handleLeave = useCallback(() => {
    offGameCreated();
    offGameDeleted();
    leaveLobbyChannel();
    setPlayerName(null);
    setName("");
    setPlayers([]);
    setGames([]);
  }, [setPlayerName]);

  const navigateToGame = useCallback(
    (gameId: string, playerCount: number) => {
      onStartGame({
        playerName: playerName ?? "",
        gameId,
        playerId: playerId ?? "",
        playerCount,
      });
    },
    [playerName, playerId, onStartGame],
  );

  const updateGamePlayers = useCallback((players: GamePlayer[]) => {
    gamePlayersRef.current = players;
    setGamePlayers(players);
  }, []);

  const handleCreateGame = useCallback(async () => {
    if (!playerName) return;
    try {
      const game = await createGame(`${playerName}'s Race`);
      setIsCreator(true);

      const { players: gamePlrs } = await joinGame(game.id, playerName, undefined, 1, {
        onPlayersChanged: updateGamePlayers,
        onPositionUpdate: () => {},
        onGameStarted: () => navigateToGame(game.id, gamePlayersRef.current.length),
      });
      updateGamePlayers(gamePlrs);
      setCurrentGameId(game.id);
    } catch (err) {
      setError("Failed to create game");
      console.error(err);
    }
  }, [playerName, navigateToGame, updateGamePlayers]);

  const handleJoinGame = useCallback(
    async (gameId: string) => {
      if (!playerName) return;
      try {
        const { players: gamePlrs } = await joinGame(gameId, playerName, undefined, 1, {
          onPlayersChanged: updateGamePlayers,
          onPositionUpdate: () => {},
          onGameStarted: () => navigateToGame(gameId, gamePlayersRef.current.length),
        });
        updateGamePlayers(gamePlrs);
        setCurrentGameId(gameId);
        setIsCreator(false);
      } catch (err) {
        setError("Failed to join game");
        console.error(err);
      }
    },
    [playerName, navigateToGame, updateGamePlayers],
  );

  const handleLeaveGame = useCallback(() => {
    leaveGame();
    setCurrentGameId(null);
    setGamePlayers([]);
    setIsCreator(false);
  }, []);

  const handleStartRace = useCallback(() => {
    startGame();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          <span style={styles.gooseIcon}>🪿</span> Goose Lobby
        </h1>

        {!playerName ? (
          <form onSubmit={handleJoin} style={styles.form}>
            <p style={styles.subtitle}>
              Enter your name to join the waddle.
            </p>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your goose name…"
              maxLength={24}
              style={styles.input}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!name.trim() || connecting}
              style={{
                ...styles.button,
                opacity: !name.trim() || connecting ? 0.5 : 1,
              }}
            >
              {connecting ? "Connecting…" : "Join Lobby"}
            </button>
            {error && <p style={styles.error}>{error}</p>}
          </form>
        ) : currentGameId ? (
          <div style={styles.lobbyContent}>
            <div style={styles.welcomeBar}>
              <span>
                Playing as <strong>{playerName}</strong>
              </span>
              <button onClick={handleLeaveGame} style={styles.leaveButton}>
                Leave Game
              </button>
            </div>

            <div style={styles.playerListHeader}>
              <span style={styles.dot} />
              {gamePlayers.length} player{gamePlayers.length !== 1 ? "s" : ""} in
              game
            </div>

            <ul style={styles.playerList}>
              {gamePlayers.map((p) => (
                <li
                  key={p.id}
                  style={{
                    ...styles.playerItem,
                    ...(p.name === playerName ? styles.playerItemMe : {}),
                  }}
                >
                  <span style={styles.playerEmoji}>{pickEmoji(p.id)}</span>
                  <span style={styles.playerName}>{p.name}</span>
                  {p.name === playerName && (
                    <span style={styles.youBadge}>you</span>
                  )}
                </li>
              ))}
            </ul>

            {gamePlayers.length < 4 && (
              <p style={styles.aiNote}>
                {4 - gamePlayers.length} AI goose{4 - gamePlayers.length !== 1 ? "s" : ""} will fill empty slots
              </p>
            )}

            {isCreator ? (
              <button onClick={handleStartRace} style={styles.startButton}>
                Start Race 🏁
              </button>
            ) : (
              <div style={styles.waitingText}>
                Waiting for host to start the race...
              </div>
            )}

            {error && <p style={styles.error}>{error}</p>}
          </div>
        ) : (
          <div style={styles.lobbyContent}>
            <div style={styles.welcomeBar}>
              <span>
                Playing as <strong>{playerName}</strong>
              </span>
              <button onClick={handleLeave} style={styles.leaveButton}>
                Leave
              </button>
            </div>

            <div style={styles.playerListHeader}>
              <span style={styles.dot} />
              {players.length} goose{players.length !== 1 ? "s" : ""} in the
              pond
            </div>

            <ul style={styles.playerList}>
              {players
                .sort((a, b) => a.joinedAt - b.joinedAt)
                .map((p) => (
                  <li
                    key={p.id}
                    style={{
                      ...styles.playerItem,
                      ...(p.name === playerName ? styles.playerItemMe : {}),
                    }}
                  >
                    <span style={styles.playerEmoji}>{pickEmoji(p.id)}</span>
                    <span style={styles.playerName}>{p.name}</span>
                    {p.name === playerName && (
                      <span style={styles.youBadge}>you</span>
                    )}
                  </li>
                ))}
            </ul>

            <div style={styles.sectionDivider} />

            <div style={styles.playerListHeader}>
              <span>Games</span>
            </div>

            {games.length === 0 ? (
              <p style={styles.noGames}>No games yet. Create one!</p>
            ) : (
              <ul style={styles.playerList}>
                {games.map((game) => (
                  <li key={game.id} style={styles.gameItem}>
                    <span style={styles.gameName}>{game.name}</span>
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      style={styles.joinButton}
                    >
                      Join
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button onClick={handleCreateGame} style={styles.startButton}>
              Create Game
            </button>

            {error && <p style={styles.error}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f1a0f 0%, #1a2e1a 50%, #0f1a0f 100%)",
    padding: 20,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 420,
    color: "#e8f5e8",
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    textAlign: "center" as const,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  gooseIcon: {
    fontSize: 32,
    marginRight: 8,
  },
  subtitle: {
    color: "rgba(232,245,232,0.6)",
    textAlign: "center" as const,
    margin: "8px 0 24px",
    fontSize: 15,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  input: {
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "#e8f5e8",
    fontSize: 16,
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    padding: "14px 20px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #4ade80, #22c55e)",
    color: "#052e16",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.1s, opacity 0.2s",
  },
  error: {
    color: "#f87171",
    fontSize: 14,
    textAlign: "center" as const,
    margin: 0,
  },
  lobbyContent: {
    marginTop: 20,
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  welcomeBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 15,
    color: "rgba(232,245,232,0.8)",
  },
  leaveButton: {
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "rgba(232,245,232,0.6)",
    fontSize: 13,
    cursor: "pointer",
  },
  playerListHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "rgba(232,245,232,0.5)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 8px #4ade80",
    display: "inline-block",
  },
  playerList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  playerItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    transition: "background 0.2s",
  },
  playerItemMe: {
    background: "rgba(74,222,128,0.1)",
    border: "1px solid rgba(74,222,128,0.2)",
  },
  playerEmoji: {
    fontSize: 22,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 600,
    flex: 1,
  },
  youBadge: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    color: "#4ade80",
    background: "rgba(74,222,128,0.15)",
    padding: "2px 8px",
    borderRadius: 6,
    letterSpacing: "0.05em",
  },
  startButton: {
    padding: "14px 20px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #facc15, #f59e0b)",
    color: "#451a03",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
    transition: "transform 0.1s, opacity 0.2s",
  },
  sectionDivider: {
    height: 1,
    background: "rgba(255,255,255,0.1)",
    margin: "4px 0",
  },
  noGames: {
    color: "rgba(232,245,232,0.4)",
    fontSize: 14,
    textAlign: "center" as const,
    margin: "4px 0",
  },
  gameItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  gameName: {
    fontSize: 15,
    fontWeight: 600,
    flex: 1,
  },
  joinButton: {
    padding: "6px 16px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #4ade80, #22c55e)",
    color: "#052e16",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  aiNote: {
    color: "rgba(232,245,232,0.4)",
    fontSize: 13,
    textAlign: "center" as const,
    margin: 0,
    fontStyle: "italic",
  },
  waitingText: {
    textAlign: "center" as const,
    color: "rgba(232,245,232,0.5)",
    fontSize: 15,
    padding: "14px 0",
    fontStyle: "italic",
  },
};

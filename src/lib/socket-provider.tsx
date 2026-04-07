import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Socket } from "phoenix";
import { setSocketInstance } from "./socket";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "/socket";
const MAX_ATTEMPTS = 5;

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "failed"
  | "reconnecting";

type ConnectionContextValue = {
  status: ConnectionStatus;
  playerId: string | null;
  playerName: string | null;
  setPlayerName: (name: string | null) => void;
  retry: () => void;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error("useConnection must be used inside <SocketProvider>");
  }
  return ctx;
}

// Lazy initializer: runs once on first render. SSR-safe — returns null on
// the server, a fresh UUID on the client. Doing this in `useState` instead of
// inside `useEffect` avoids the react-hooks/set-state-in-effect rule and
// prevents the cascading render that a setState-in-effect would cause.
function generatePlayerId(): string | null {
  if (typeof window === "undefined") return null;
  return crypto.randomUUID();
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [playerId] = useState<string | null>(generatePlayerId);
  const [playerName, setPlayerName] = useState<string | null>(null);

  // Refs for state we don't want to trigger re-renders on.
  const socketRef = useRef<Socket | null>(null);
  const attemptsRef = useRef(0);
  const everConnectedRef = useRef(false);
  // Strict Mode safety: the connect setup runs exactly once per component
  // instance. Without this, dev's mount→cleanup→mount cycle would create
  // a second Socket and double-register onOpen/onClose callbacks.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!playerId) return; // SSR — wait for client mount.
    if (initializedRef.current) return;
    initializedRef.current = true;

    const socket = new Socket(SOCKET_URL, {
      params: { player_id: playerId },
    });

    socket.onOpen(() => {
      everConnectedRef.current = true;
      attemptsRef.current = 0;
      setStatus("connected");
    });

    // We count failed connection cycles in onClose rather than onError.
    // Phoenix's onError can fire multiple times during a single failed
    // attempt; onClose fires once per cycle (after onError) and is the
    // reliable place to count.
    socket.onClose(() => {
      attemptsRef.current += 1;

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        // Halt Phoenix's auto-reconnect timer. The provider stays mounted;
        // the user must hit Retry to start a fresh budget.
        socket.disconnect();
        setStatus("failed");
        return;
      }

      setStatus(everConnectedRef.current ? "reconnecting" : "connecting");
    });

    socketRef.current = socket;
    setSocketInstance(socket, playerId);
    socket.connect();

    // No teardown — the provider lives for the entire session and the
    // socket is meant to persist across all child renders.
  }, [playerId]);

  const retry = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    attemptsRef.current = 0;
    setStatus(everConnectedRef.current ? "reconnecting" : "connecting");
    socket.connect();
  }, []);

  const value: ConnectionContextValue = {
    status,
    playerId,
    playerName,
    setPlayerName,
    retry,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

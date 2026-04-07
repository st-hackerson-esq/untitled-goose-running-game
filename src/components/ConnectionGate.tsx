import { useConnection } from "@/lib/socket-provider";

export function ConnectionGate({ children }: { children: React.ReactNode }) {
  const { status, retry } = useConnection();

  if (status === "connecting") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner}>🪿</div>
          <h1 style={styles.title}>Connecting to server…</h1>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Could not establish a connection</h1>
          <p style={styles.subtitle}>
            We couldn&apos;t reach the goose server. Make sure it&apos;s running and try again.
          </p>
          <button onClick={retry} style={styles.button}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {status === "reconnecting" && (
        <div style={styles.banner}>
          <span style={styles.bannerDot} />
          Reconnecting…
        </div>
      )}
    </>
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
    textAlign: "center" as const,
  },
  spinner: {
    fontSize: 56,
    animation: "goose-bounce 1.2s ease-in-out infinite",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "rgba(232,245,232,0.6)",
    margin: "12px 0 24px",
    fontSize: 15,
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
    width: "100%",
  },
  banner: {
    position: "fixed",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    borderRadius: 999,
    background: "rgba(15, 26, 15, 0.85)",
    border: "1px solid rgba(250, 204, 21, 0.4)",
    color: "#fde68a",
    fontSize: 13,
    fontWeight: 600,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backdropFilter: "blur(8px)",
    zIndex: 9999,
    pointerEvents: "none",
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#facc15",
    boxShadow: "0 0 8px #facc15",
    display: "inline-block",
  },
};

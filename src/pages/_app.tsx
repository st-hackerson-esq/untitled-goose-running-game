import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { WorldProvider } from "koota/react";
import { world } from "@/core/world";
import { SocketProvider } from "@/lib/socket-provider";
import { ConnectionGate } from "@/components/ConnectionGate";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WorldProvider world={world}>
      <SocketProvider>
        <ConnectionGate>
          <Component {...pageProps} />
        </ConnectionGate>
      </SocketProvider>
    </WorldProvider>
  );
}

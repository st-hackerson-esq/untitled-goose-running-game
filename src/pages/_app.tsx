import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { WorldProvider } from "koota/react";
import { world } from "@/core/world";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WorldProvider world={world}>
      <Component {...pageProps} />
    </WorldProvider>
  );
}

import { useState, useCallback } from "react";
import { Lobby } from "@/components/Lobby";
import { Scene } from "@/components/Scene";

type GameParams = {
  playerName: string;
  gameId: string;
  playerId: string;
  playerCount: number;
};

export default function App() {
  const [gameParams, setGameParams] = useState<GameParams | null>(null);

  const handleStartGame = useCallback((params: GameParams) => {
    setGameParams(params);
  }, []);

  const handleGameEnded = useCallback(() => {
    setGameParams(null);
  }, []);

  if (gameParams) {
    return (
      <Scene
        playerName={gameParams.playerName}
        gameId={gameParams.gameId}
        playerId={gameParams.playerId}
        playerCount={gameParams.playerCount}
        onGameEnded={handleGameEnded}
      />
    );
  }

  return <Lobby onStartGame={handleStartGame} />;
}

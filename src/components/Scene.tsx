import { Canvas } from "@react-three/fiber";
import { GooseRenderer } from "./GooseRenderer";
import { GrassRenderer } from "./GrassRenderer";
import { TrackRenderer } from "./TrackRenderer";
import { CameraRenderer } from "./CameraRenderer";
import { Frameloop } from "./Frameloop";
import { Startup } from "./Startup";

type SceneProps = {
  playerName: string;
  gameId: string;
  playerId: string;
  playerCount: number;
  onGameEnded: () => void;
};

const Scene = ({ playerName, gameId, playerId, playerCount, onGameEnded }: SceneProps) => {
  return (
    <Canvas
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
    >
      <group rotation={[0, Math.PI / 2, 0]}>
        <TrackRenderer />
        <GrassRenderer />
        <GooseRenderer />
        <CameraRenderer />
      </group>
      <Frameloop />
      <Startup playerName={playerName} gameId={gameId} playerId={playerId} playerCount={playerCount} onGameEnded={onGameEnded} />
      <directionalLight position={[-5, 10, 5]} intensity={1.5} />
      <ambientLight intensity={0.4} />
    </Canvas>
  );
};

export { Scene };

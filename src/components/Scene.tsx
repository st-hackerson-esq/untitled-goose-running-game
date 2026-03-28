import { Canvas } from "@react-three/fiber";
import { GooseRenderer } from "./GooseRenderer";
import { TrackRenderer } from "./TrackRenderer";
import { CameraRenderer } from "./CameraRenderer";
import { Frameloop } from "./Frameloop";
import { Startup } from "./Startup";

const Scene = () => {
  return (
    <Canvas
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
    >
      <group rotation={[0, Math.PI / 2, 0]}>
        <TrackRenderer />
        <GooseRenderer />
        <CameraRenderer />
      </group>
      <Frameloop />
      <Startup />
      <directionalLight position={[-5, 10, 5]} intensity={1.5} />
      <ambientLight intensity={0.4} />
    </Canvas>
  );
};

export { Scene };

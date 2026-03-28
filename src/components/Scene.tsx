import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { GooseRenderer } from "./GooseRenderer";
import { Frameloop } from "./Frameloop";
import { Startup } from "./Startup";

const Scene = () => {
  return (
    <Canvas
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
    >
      <GooseRenderer />
      <Frameloop />
      <Startup />
      <OrbitControls />
      <PerspectiveCamera makeDefault position={[5, 5, 5]} />
      <directionalLight position={[-5, 5, 5]} intensity={1.5} />
      <ambientLight intensity={0.3} />
      <axesHelper args={[10]} />
    </Canvas>
  );
};

export { Scene };

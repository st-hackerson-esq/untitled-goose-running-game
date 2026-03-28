import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "koota/react";
import type { Entity } from "koota";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { IsActive, OrthographicCamera, Ref } from "@/core/traits";

function CameraView({ entity }: { entity: Entity }) {
  const set = useThree((s) => s.set);
  const size = useThree((s) => s.size);
  const cameraRef = useRef<THREE.OrthographicCamera>(null!);

  const handleInit = useCallback(
    (cam: THREE.OrthographicCamera | null) => {
      if (!cam || !entity.isAlive()) return;
      cameraRef.current = cam;
      entity.add(Ref(cam));
      return () => entity.remove(Ref);
    },
    [entity],
  );

  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    set({ camera: cam });
  }, [set]);

  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    cam.left = size.width / -2;
    cam.right = size.width / 2;
    cam.top = size.height / 2;
    cam.bottom = size.height / -2;
    cam.updateProjectionMatrix();
  }, [size]);

  return <orthographicCamera ref={handleInit} near={-100} far={100} zoom={100} />;
}

export function CameraRenderer() {
  const cameras = useQuery(OrthographicCamera, IsActive);
  return (
    <>
      {cameras.map((entity) => (
        <CameraView key={entity.id()} entity={entity} />
      ))}
    </>
  );
}

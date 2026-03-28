import { useFrame } from "@react-three/fiber";
import { useWorld } from "koota/react";
import { updateTime } from "@/core/systems/update-time";
import { syncPosition } from "@/core/systems/sync-position";

export function Frameloop() {
  const world = useWorld();

  useFrame(() => {
    updateTime(world);
    syncPosition(world);
  });

  return null;
}

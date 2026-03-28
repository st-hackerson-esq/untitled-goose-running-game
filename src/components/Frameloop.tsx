import { useFrame } from "@react-three/fiber";
import { useWorld } from "koota/react";
import { updateTime } from "@/core/systems/update-time";
import { advanceRace } from "@/core/systems/advance-race";
import { mapProgressToTrack } from "@/core/systems/map-progress-to-track";
import { followTarget } from "@/core/systems/follow-player";
import { syncTransform } from "@/core/systems/sync-transform";

export function Frameloop() {
  const world = useWorld();

  useFrame(() => {
    updateTime(world);
    advanceRace(world);
    mapProgressToTrack(world);
    followTarget(world);
    syncTransform(world);
  });

  return null;
}

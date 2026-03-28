import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useWorld } from "koota/react";
import { updateTime } from "@/core/systems/update-time";
import { updatePlayerInput, initPlayerInput, cleanupPlayerInput } from "@/core/systems/player-input";
import { advanceRace } from "@/core/systems/advance-race";
import { mapProgressToTrack } from "@/core/systems/map-progress-to-track";
import { followTarget } from "@/core/systems/follow-player";
import { swayGrass } from "@/core/systems/sway-grass";
import { syncTransform } from "@/core/systems/sync-transform";

export function Frameloop() {
  const world = useWorld();

  useEffect(() => {
    initPlayerInput();
    return cleanupPlayerInput;
  }, []);

  useFrame(() => {
    updateTime(world);
    updatePlayerInput(world);
    advanceRace(world);
    mapProgressToTrack(world);
    followTarget(world);
    swayGrass(world);
    syncTransform(world);
  });

  return null;
}

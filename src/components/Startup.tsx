import { useEffect } from "react";
import { useActions } from "koota/react";
import { actions } from "@/core/actions";

const PLAYER_COUNT = 4;

export function Startup() {
  const { spawnGoose, spawnGrassAlongTrack, spawnCamera } = useActions(actions);

  useEffect(() => {
    const selfGooseIndex = 0;
    const geese = Array.from({ length: PLAYER_COUNT }, (_, i) => {
      if (i === selfGooseIndex) return spawnGoose({ index: i, self: true });
      return spawnGoose({ index: i });
    });

    const grass = spawnGrassAlongTrack();
    const camera = spawnCamera(geese[selfGooseIndex]);

    return () => {
      camera.destroy();
      grass.forEach((g) => g.destroy());
      geese.forEach((g) => g.destroy());
    };
  }, [spawnGoose, spawnGrassAlongTrack, spawnCamera]);

  return null;
}

import { useEffect } from "react";
import { useActions } from "koota/react";
import { actions } from "@/core/actions";

const PLAYER_COUNT = 4;

export function Startup() {
  const { spawnGoose, spawnCamera } = useActions(actions);

  useEffect(() => {
    const geese = Array.from({ length: PLAYER_COUNT }, (_, i) => spawnGoose(i));
    const camera = spawnCamera(geese[0]);
    return () => {
      camera.destroy();
      geese.forEach((g) => g.destroy());
    };
  }, [spawnGoose, spawnCamera]);

  return null;
}

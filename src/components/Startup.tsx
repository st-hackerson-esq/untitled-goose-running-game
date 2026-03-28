import { useEffect } from "react";
import { useActions } from "koota/react";
import { actions } from "@/core/actions";

export function Startup() {
  const { spawnGoose } = useActions(actions);

  useEffect(() => {
    const goose = spawnGoose(0, 0, 0);
    return () => goose.destroy();
  }, [spawnGoose]);

  return null;
}

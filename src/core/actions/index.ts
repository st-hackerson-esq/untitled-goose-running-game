import { createActions } from "koota";
import { IsGoose, Position } from "../traits";

export const actions = createActions((world) => ({
  spawnGoose: (x = 0, y = 0, z = 0) => {
    return world.spawn(Position({ x, y, z }), IsGoose);
  },
}));

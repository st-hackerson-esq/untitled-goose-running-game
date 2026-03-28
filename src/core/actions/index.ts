import { createActions } from "koota";
import type { Entity } from "koota";
import {
  Follow,
  IsActive,
  IsGoose,
  OrthographicCamera,
  Player,
  Position,
  RaceProgress,
  Rotation,
} from "../traits";

export const actions = createActions((world) => ({
  spawnGoose: (index: number) => {
    return world.spawn(
      Position,
      IsGoose,
      RaceProgress({ value: 0 }),
      Player({ index }),
    );
  },
  spawnCamera: (target: Entity) => {
    return world.spawn(
      Position({ x: 5, y: 8, z: 5 }),
      Rotation,
      OrthographicCamera,
      IsActive,
      Follow(target),
    );
  },
}));

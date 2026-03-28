import type { World } from "koota";
import { Position, Ref } from "../traits";

export function syncPosition(world: World) {
  world.query(Position, Ref).updateEach(([pos, ref]) => {
    if (!ref) return;
    ref.position.set(pos.x, pos.y, pos.z);
  });
}

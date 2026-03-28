import type { World } from "koota";
import { Position, Ref, Rotation } from "../traits";

export function syncTransform(world: World) {
  world.query(Position, Ref).updateEach(([pos, ref]) => {
    if (!ref) return;
    ref.position.set(pos.x, pos.y, pos.z);
  });

  world.query(Rotation, Ref).updateEach(([rot, ref]) => {
    if (!ref) return;
    ref.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  });
}

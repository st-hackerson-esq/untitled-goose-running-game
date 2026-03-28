import * as THREE from "three";
import type { World } from "koota";
import { Follow, Position, Rotation } from "../traits";

const CAMERA_OFFSET = new THREE.Vector3(-5, 8, 5);
const _camPos = new THREE.Vector3();
const _target = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

export function followTarget(world: World) {
  for (const entity of world.query(Follow("*"), Position, Rotation)) {
    const target = entity.targetFor(Follow);
    if (!target?.has(Position)) continue;

    const tp = target.get(Position)!;

    entity.set(Position, {
      x: tp.x + CAMERA_OFFSET.x,
      y: tp.y + CAMERA_OFFSET.y,
      z: tp.z + CAMERA_OFFSET.z,
    });

    const pos = entity.get(Position)!;
    _camPos.set(pos.x, pos.y, pos.z);
    _target.set(tp.x, tp.y, tp.z);
    _matrix.lookAt(_camPos, _target, _up);
    _quat.setFromRotationMatrix(_matrix);

    entity.set(Rotation, {
      x: _quat.x,
      y: _quat.y,
      z: _quat.z,
      w: _quat.w,
    });
  }
}

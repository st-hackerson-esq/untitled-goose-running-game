import { trait } from "koota";
import type { Object3D } from "three";

export const Time = trait({ last: 0, delta: 0 });

export const Position = trait({ x: 0, y: 0, z: 0 });

export const Ref = trait(() => null! as Object3D);

export const IsGoose = trait();

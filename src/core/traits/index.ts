import { relation, trait } from "koota";
import type { Object3D } from "three";

export const Time = trait({ last: 0, delta: 0 });

export const Position = trait({ x: 0, y: 0, z: 0 });
export const Rotation = trait({ x: 0, y: 0, z: 0, w: 1 });

export const Ref = trait(() => null! as Object3D);

export const IsGoose = trait();
export const IsActive = trait();
export const OrthographicCamera = trait();

export const RaceProgress = trait({ value: 0 });

export const Player = trait({ index: 0 });

export const Follow = relation({ exclusive: true });

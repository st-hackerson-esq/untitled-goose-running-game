import * as THREE from "three";
import { createActions } from "koota";
import type { Entity } from "koota";
import {
  Follow,
  IsActive,
  IsGoose,
  IsGrass,
  OrthographicCamera,
  Player,
  PlayerInput,
  Position,
  RaceProgress,
  Rotation,
} from "../traits";
import { trackCurve } from "../track";

const GRASS_SAMPLES = 30;
const PATCHES_PER_SIDE = 3;
const TRACK_HALF_WIDTH = 2.2;
const GOOSE_NAMES = [
  "Puddles",
  "Biscuit",
  "Noodle",
  "Mochi",
  "Pickles",
  "Waffles",
  "Pebbles",
  "Sprout",
  "Nugget",
  "Ducky",
  "Peaches",
  "Cupcake",
  "Bubbles",
  "Muffin",
  "Turnip",
  "Clover",
  "Truffle",
  "Dumpling",
];
const _pt = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function randomGooseName() {
  return GOOSE_NAMES[Math.floor(Math.random() * GOOSE_NAMES.length)];
}

export const actions = createActions((world) => ({
  spawnGoose: ({ index, name }: { index: number; name?: string }) => {
    const entity = world.spawn(
      Position,
      IsGoose,
      RaceProgress({ value: 0 }),
      Player({ index, name: name ?? randomGooseName() }),
    );
    if (index === 0) entity.add(PlayerInput);
    return entity;
  },
  spawnGrassAlongTrack: () => {
    const patches: Entity[] = [];
    for (let i = 0; i < GRASS_SAMPLES; i++) {
      const t = i / (GRASS_SAMPLES - 1);
      trackCurve.getPointAt(t, _pt);
      trackCurve.getTangentAt(t, _tan);
      _normal.crossVectors(_up, _tan).normalize();

      for (let s = 0; s < PATCHES_PER_SIDE; s++) {
        const seed = i * PATCHES_PER_SIDE + s;
        const dist = TRACK_HALF_WIDTH + 0.5 + seededRandom(seed) * 6;
        const jitterX = (seededRandom(seed + 500) - 0.5) * 1.5;

        patches.push(
          world.spawn(
            Position({
              x: _pt.x + _normal.x * dist + jitterX,
              y: 0,
              z: _pt.z + _normal.z * dist,
            }),
            IsGrass,
          ),
        );
        patches.push(
          world.spawn(
            Position({
              x: _pt.x - _normal.x * dist + jitterX,
              y: 0,
              z: _pt.z - _normal.z * dist,
            }),
            IsGrass,
          ),
        );
      }
    }
    return patches;
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

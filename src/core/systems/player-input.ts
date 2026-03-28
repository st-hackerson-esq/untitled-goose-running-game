import type { World } from "koota";
import { Player, PlayerInput, Time } from "../traits";

const EXPECTED_SEQUENCE = ["q", "p"] as const;
const SPEED_DECAY = 4.0;
const MAX_SPEED = 0.15;
const MIN_INTERVAL = 50;
const MAX_INTERVAL = 500;

let nextKeyIndex = 0;
let lastStrokeTime = 0;
let currentSpeed = 0;

function handleKeyDown(e: KeyboardEvent) {
  const expected = EXPECTED_SEQUENCE[nextKeyIndex % EXPECTED_SEQUENCE.length];
  if (e.key !== expected) return;

  const now = performance.now();
  if (lastStrokeTime > 0) {
    const interval = Math.max(now - lastStrokeTime, MIN_INTERVAL);
    if (interval < MAX_INTERVAL) {
      currentSpeed = MAX_SPEED * (1 - (interval - MIN_INTERVAL) / (MAX_INTERVAL - MIN_INTERVAL));
    }
  }

  lastStrokeTime = now;
  nextKeyIndex++;
}

let listening = false;

export function initPlayerInput() {
  if (listening) return;
  listening = true;
  window.addEventListener("keydown", handleKeyDown);
}

export function cleanupPlayerInput() {
  window.removeEventListener("keydown", handleKeyDown);
  listening = false;
  nextKeyIndex = 0;
  lastStrokeTime = 0;
  currentSpeed = 0;
}

export function updatePlayerInput(world: World) {
  const { delta } = world.get(Time)!;

  currentSpeed = Math.max(currentSpeed - SPEED_DECAY * delta * currentSpeed, 0);

  for (const entity of world.query(PlayerInput, Player)) {
    const player = entity.get(Player)!;
    if (player.index === 0) {
      entity.set(PlayerInput, { speed: currentSpeed });
    }
  }
}

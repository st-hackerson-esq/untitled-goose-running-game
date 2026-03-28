import type { World } from "koota";
import { Not } from "koota";
import { Player, PlayerInput, RaceProgress, Time } from "../traits";

const BASE_SPEED = 0.04;

export function advanceRace(world: World) {
  const { delta } = world.get(Time)!;

  // AI-controlled geese (no PlayerInput trait)
  world
    .query(RaceProgress, Player, Not(PlayerInput))
    .updateEach(([progress, player]) => {
      const wobble = Math.sin(performance.now() * 0.003 + player.index * 1.7) * 0.02;
      progress.value = Math.min(progress.value + (BASE_SPEED + wobble) * delta, 1);
    });

  // Player-controlled geese
  world
    .query(RaceProgress, PlayerInput)
    .updateEach(([progress, input]) => {
      progress.value = Math.min(progress.value + input.speed * delta, 1);
    });
}

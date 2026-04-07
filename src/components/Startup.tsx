import { useEffect } from "react";
import { useActions, useWorld } from "koota/react";
import type { Entity } from "koota";
import { actions, GOOSE_NAMES } from "@/core/actions";
import { RaceProgress } from "@/core/traits";
import {
  joinGame,
  type GamePlayer,
} from "@/lib/game-socket";

const TOTAL_GEESE = 4;

function randomGooseName(): string {
  return GOOSE_NAMES[Math.floor(Math.random() * GOOSE_NAMES.length)];
}

type StartupProps = {
  playerName: string;
  gameId: string;
  playerId: string;
  playerCount: number;
  onGameEnded: () => void;
};

export function Startup({ playerName, gameId, playerId, playerCount, onGameEnded }: StartupProps) {
  const { spawnGoose, spawnGrassAlongTrack, spawnCamera } = useActions(actions);
  const world = useWorld();

  useEffect(() => {
    let selfEntity: Entity;
    const remoteEntities = new Map<string, Entity>();
    const aiEntities: Entity[] = [];
    let grass: Entity[];
    let camera: Entity;
    let destroyed = false;

    const handlePositionUpdate = (remotePlayerId: string, progress: number) => {
      const entity = remoteEntities.get(remotePlayerId);
      if (entity?.isAlive()) {
        entity.set(RaceProgress, { value: progress });
      }
    };

    function spawnEntities(remotePlayers: GamePlayer[]) {
      const allPlayers = [
        { id: "__self__", name: playerName },
        ...remotePlayers,
      ].sort((a, b) => a.name.localeCompare(b.name));

      let nextIndex = 0;
      for (const p of allPlayers) {
        if (nextIndex >= TOTAL_GEESE) break;
        if (p.id === "__self__") {
          selfEntity = spawnGoose({ index: nextIndex, name: playerName, self: true });
        } else {
          const entity = spawnGoose({ index: nextIndex, name: p.name, remote: true });
          remoteEntities.set(p.id, entity);
        }
        nextIndex++;
      }

      while (nextIndex < TOTAL_GEESE) {
        const aiName = randomGooseName() + " (AI)";
        aiEntities.push(spawnGoose({ index: nextIndex, name: aiName }));
        nextIndex++;
      }

      grass = spawnGrassAlongTrack();
      camera = spawnCamera(selfEntity!);
    }

    async function init() {
      if (!gameId) {
        spawnEntities([]);
        return;
      }

      const { players } = await joinGame(
        gameId,
        playerName,
        playerId || undefined,
        playerCount,
        {
          onPlayersChanged: () => {},
          onPositionUpdate: handlePositionUpdate,
          onGameStarted: () => {},
          onGameEnded,
        },
      );
      if (destroyed) return;
      const remotePlayers = players.filter((p) => p.name !== playerName);
      spawnEntities(remotePlayers);
    }

    init();

    return () => {
      // Note: deliberately do NOT call leaveGame() here. Under React Strict
      // Mode (and any future remount-driven cleanup), leaving the channel
      // here would trigger a server-side terminate → remove_player → empty
      // player set → game deletion, even though the user is still in the
      // game. The channel is owned by the lib singleton and is either
      // reused (idempotent rejoin to the same gameId) or replaced (on a
      // join to a different gameId). Real "leave game" actions go through
      // handleLeaveGame in Lobby, which calls leaveGame() explicitly.
      destroyed = true;
      camera?.destroy();
      grass?.forEach((g) => g.destroy());
      selfEntity?.destroy();
      remoteEntities.forEach((e) => e.destroy());
      aiEntities.forEach((e) => e.destroy());
    };
  }, [playerName, gameId, playerId, playerCount, onGameEnded, spawnGoose, spawnGrassAlongTrack, spawnCamera, world]);

  return null;
}

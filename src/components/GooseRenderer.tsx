import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useTraitEffect } from "koota/react";
import type { Entity } from "koota";
import { Group } from "three";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { useGLTF, useAnimations } from "@react-three/drei";
import { IsGoose, RaceProgress, Ref } from "@/core/traits";

const GOOSE_MODEL_PATH = "/assets/models/goose.glb";

function GooseView({ entity }: { entity: Entity }) {
  const { scene, animations } = useGLTF(GOOSE_MODEL_PATH);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const groupRef = useRef<Group>(null);
  const { actions } = useAnimations(animations, groupRef);

  const handleInit = useCallback(
    (group: Group | null) => {
      if (!group || !entity.isAlive()) return;
      entity.add(Ref(group));
      return () => entity.remove(Ref);
    },
    [entity],
  );

  useEffect(() => {
    actions["GooseRun"]?.reset().fadeIn(0.2).play();
  }, [actions]);

  useTraitEffect(entity, RaceProgress, (progress) => {
    if (progress && progress.value >= 1) {
      actions["GooseRun"]?.fadeOut(0.3);
      actions["GooseIdle"]?.reset().fadeIn(0.2).play();
    }
  });

  return (
    <group
      ref={(node) => {
        (groupRef as React.MutableRefObject<Group | null>).current = node;
        handleInit(node);
      }}
    >
      <primitive object={clone} rotation={[0, Math.PI / 2, 0]} castShadow />
    </group>
  );
}

useGLTF.preload(GOOSE_MODEL_PATH);

export function GooseRenderer() {
  const geese = useQuery(IsGoose);
  return (
    <>
      {geese.map((entity) => (
        <GooseView key={entity.id()} entity={entity} />
      ))}
    </>
  );
}

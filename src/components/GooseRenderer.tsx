import { useCallback } from "react";
import { useQuery } from "koota/react";
import type { Entity } from "koota";
import type { Mesh } from "three";
import { IsGoose, Ref } from "@/core/traits";

function GooseView({ entity }: { entity: Entity }) {
  const handleInit = useCallback(
    (mesh: Mesh | null) => {
      if (!mesh || !entity.isAlive()) return;
      entity.add(Ref(mesh));
      return () => entity.remove(Ref);
    },
    [entity],
  );

  return (
    <mesh ref={handleInit}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

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

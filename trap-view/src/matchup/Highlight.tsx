import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel } from '../data/sceneModel';
import { GEO } from '../players/geometry';
import { useTrapView } from '../state/store';

/**
 * Hebt die beiden Spieler des aktiven Duells hervor: zwei Spots von oben und
 * Bodenringe in Teamfarbe. Die Lichter existieren immer (Intensität 0), damit beim
 * Umschalten keine Shader neu kompiliert werden.
 */
export function Highlight({ model }: { model: SceneModel }) {
  const spots = useMemo(() => [new THREE.SpotLight(), new THREE.SpotLight()], []);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const level = useRef(0);

  useMemo(() => {
    for (const s of spots) {
      s.angle = 0.3;
      s.penumbra = 0.9;
      s.decay = 1.6;
      s.distance = 30;
      s.color.set('#f4f7ff');
      s.intensity = 0;
    }
  }, [spots]);

  useFrame((state, dt) => {
    const id = useTrapView.getState().matchupId;
    const m = id ? model.matchups.find((x) => x.id === id) : undefined;
    level.current = THREE.MathUtils.damp(level.current, m ? 1 : 0, 3.5, dt);
    const pulse = 0.85 + Math.sin(state.clock.elapsedTime * 2.2) * 0.15;

    const pair = m ? [m.offense, m.defense] : [];
    spots.forEach((s, i) => {
      const p = pair[i];
      if (p) {
        const fwd = p.side === 'offense' ? -1 : 1;
        s.position.set(p.world[0] + fwd * 2.5, 9, p.world[2] + Math.sign(p.world[2] || 1) * 2);
        s.target.position.set(p.world[0], 1, p.world[2]);
        s.target.updateMatrixWorld();
      }
      s.intensity = 190 * level.current;
      const ring = rings.current[i];
      if (ring) {
        if (p) {
          ring.position.set(p.world[0], 0.02, p.world[2]);
          (ring.material as THREE.MeshBasicMaterial).color.set(
            p.side === 'offense' ? p.team.colors.accent : p.team.colors.secondary,
          );
        }
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * level.current * pulse;
        ring.visible = level.current > 0.01;
      }
    });
  });

  return (
    <>
      {spots.map((s, i) => (
        <group key={i}>
          <primitive object={s} />
          <primitive object={s.target} />
          <mesh ref={(r) => { rings.current[i] = r; }} geometry={GEO.ring} rotation-x={-Math.PI / 2} visible={false}>
            <meshBasicMaterial transparent opacity={0} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

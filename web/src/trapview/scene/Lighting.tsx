import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTrapView } from '../state/store';

/**
 * Flutlicht-Setup: ein schattenwerfendes Hauptlicht, drei Rim-Lights für die Silhouetten
 * und ein schwaches Himmelslicht. Im Matchup-Modus wird die Grundbeleuchtung abgesenkt.
 */
export function Lighting({ losX, shadowMap = 2048 }: { losX: number; shadowMap?: number }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const rims = useRef<(THREE.DirectionalLight | null)[]>([]);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dim = useRef(1);

  useEffect(() => {
    const k = key.current;
    if (!k) return;
    k.target.position.set(losX, 0, 0);
    k.target.updateMatrixWorld();
    for (const r of rims.current) {
      if (!r) continue;
      r.target.position.set(losX, 1, 0);
      r.target.updateMatrixWorld();
    }
  }, [losX]);

  useFrame((_, dt) => {
    const target = useTrapView.getState().matchupId ? 0.38 : 1;
    dim.current = THREE.MathUtils.damp(dim.current, target, 3, dt);
    const d = dim.current;
    if (key.current) key.current.intensity = 3.8 * d;
    if (hemi.current) hemi.current.intensity = 0.75 * (0.5 + 0.5 * d);
    const base = [2.6, 2.0, 1.6];
    rims.current.forEach((r, i) => r && (r.intensity = base[i] * (0.45 + 0.55 * d)));
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#6b80a8', '#141c16', 0.75]} />
      <directionalLight
        ref={key}
        position={[losX + 3, 48, 38]}
        color="#e6edff"
        intensity={3.8}
        castShadow
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
        shadow-radius={5}
      >
        <orthographicCamera attach="shadow-camera" args={[-36, 36, 30, -30, 1, 140]} />
      </directionalLight>
      <directionalLight ref={(l) => { rims.current[0] = l; }} position={[losX + 40, 16, -40]} color="#9dbdff" intensity={2.2} />
      <directionalLight ref={(l) => { rims.current[1] = l; }} position={[losX - 44, 15, -36]} color="#ffd6ad" intensity={1.5} />
      <directionalLight ref={(l) => { rims.current[2] = l; }} position={[losX - 40, 14, 30]} color="#c9d8ff" intensity={1.2} />
    </>
  );
}

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { SceneModel } from '../data/sceneModel';
import { FIELD } from './fieldCoords';
import { createFieldTexture, createGrassBumpTexture } from './fieldTexture';

/** Mischt eine Teamfarbe mit dunklem Rasen, damit Endzonen satt, aber nicht grell wirken. */
function endzoneColor(hex: string): string {
  const c = new THREE.Color(hex).lerp(new THREE.Color('#0c1a12'), 0.25);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(hsl.s, 0.75), THREE.MathUtils.clamp(hsl.l, 0.1, 0.24));
  return `#${c.getHexString()}`;
}

/** Spielfeld mit Markierungen, Line of Scrimmage, First-Down-Linie und Ball. */
export function Field({ model }: { model: SceneModel }) {
  const { offense, defense, losX } = model;

  const map = useMemo(
    () =>
      createFieldTexture({
        leftEndzone: {
          color: endzoneColor(offense.colors.primary),
          text: offense.nickname.toUpperCase(),
          textColor: offense.colors.secondary,
        },
        rightEndzone: {
          color: endzoneColor(defense.colors.primary),
          text: defense.nickname.toUpperCase(),
          textColor: defense.colors.secondary,
        },
      }),
    [offense, defense],
  );
  const bump = useMemo(() => createGrassBumpTexture(), []);
  useEffect(() => () => map.dispose(), [map]);
  useEffect(() => () => bump.dispose(), [bump]);

  const totalL = FIELD.length + FIELD.border * 2;
  const totalW = FIELD.width + FIELD.border * 2;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[totalL, totalW]} />
        <meshStandardMaterial map={map} bumpMap={bump} bumpScale={0.6} roughness={0.93} metalness={0} />
      </mesh>

      {/* Line of Scrimmage – dezente Broadcast-Linie */}
      <mesh rotation-x={-Math.PI / 2} position={[losX, 0.012, 0]}>
        <planeGeometry args={[0.22, FIELD.width]} />
        <meshBasicMaterial color="#7fb2ff" transparent opacity={0.6} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[losX, 0.011, 0]}>
        <planeGeometry args={[1.6, FIELD.width]} />
        <meshBasicMaterial color="#3d6fd1" transparent opacity={0.1} toneMapped={false} depthWrite={false} />
      </mesh>

      {/* First-Down-Linie */}
      <mesh rotation-x={-Math.PI / 2} position={[losX + 10, 0.012, 0]}>
        <planeGeometry args={[0.2, FIELD.width]} />
        <meshBasicMaterial color="#f2c230" transparent opacity={0.5} toneMapped={false} depthWrite={false} />
      </mesh>

      {/* Ball */}
      <mesh position={[losX - 0.16, 0.115, 0]} scale={[0.155, 0.095, 0.095]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color="#5a3018" roughness={0.6} />
      </mesh>
    </group>
  );
}

import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Build, Stance } from '../data/types';
import type { Kit } from '../data/kits';
import { GEO, HELMET_R, MASK_ARC } from './geometry';
import { SHARED, type KitMaterials } from './materials';
import { createJerseyTexture } from './numberTexture';
import { resolvePose, SHIN, THIGH } from './stances';

export interface PlayerModelProps {
  /** Weltposition der Füße (Yards). */
  position: [number, number, number];
  rotationY: number;
  number: number;
  lastName: string;
  build: Build;
  stance: Stance;
  kit: Kit;
  materials: KitMaterials;
  /** Bestimmt den Hautton deterministisch. */
  seed: number;
}

/** Meter → Yards, plus leichte Überhöhung für eine athletische Silhouette. */
const UNIT = 1.0936 * 1.05;

/** [Breite, Höhe, Tiefe] je Körperbau. */
const BUILD: Record<Build, [number, number, number]> = {
  line: [1.2, 1.03, 1.3],
  big: [1.08, 1.02, 1.1],
  skill: [0.98, 1.0, 0.98],
};

/**
 * Stilisierter Football-Spieler aus geteilten Geometrien.
 * Lokales Koordinatensystem in Metern, Blick nach +Z. Austauschbar gegen ein
 * glTF-Modell, solange die Props-Schnittstelle erhalten bleibt.
 */
export const PlayerModel = memo(function PlayerModel(props: PlayerModelProps) {
  const { position, rotationY, number, lastName, build, stance, kit, materials: m, seed } = props;

  const pose = useMemo(() => resolvePose(stance), [stance]);
  const jersey = useMemo(() => {
    const map = createJerseyTexture(kit, number, lastName);
    // Leichte Eigenhelligkeit hält die Nummer auch im Körperschatten lesbar
    return new THREE.MeshStandardMaterial({
      map, roughness: 0.7, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.16,
    });
  }, [kit, number, lastName]);
  useEffect(() => () => {
    jersey.map?.dispose();
    jersey.dispose();
  }, [jersey]);

  const skin = SHARED.skin[seed % SHARED.skin.length];
  const [bw, bh, bd] = BUILD[build];

  return (
    <group position={position} rotation-y={rotationY} scale={UNIT}>
      <group scale={[bw, bh, bd]}>
        <group position={[0, pose.hipY, pose.hipZ]}>
          {/* Becken */}
          <mesh geometry={GEO.pelvis} material={m.pants} scale={[0.19, 0.135, 0.145]} castShadow />

          {/* Beine */}
          {[-1, 1].map((s, i) => {
            const [a, k] = pose.legs[i];
            return (
              <group key={s} position={[s * 0.105, -0.02, 0]} rotation={[-a, 0, s * pose.spread]}>
                <mesh geometry={GEO.thigh} material={m.pants} castShadow />
                <group position-y={-THIGH} rotation-x={k}>
                  <mesh geometry={GEO.shin} material={m.socks} castShadow />
                  <group position-y={-SHIN} rotation={[a - k, 0, -s * pose.spread]}>
                    <mesh geometry={GEO.shoe} material={SHARED.shoe} position={[0, -0.02, 0.06]} scale={[0.058, 0.05, 0.135]} castShadow />
                  </group>
                </group>
              </group>
            );
          })}

          {/* Oberkörper */}
          <group rotation-x={pose.lean}>
            <mesh geometry={GEO.torso} material={jersey} position-y={0.02} castShadow />
            {[-1, 1].map((s, i) => {
              const [sx, sz, elbow] = pose.arms[i];
              return (
                <group key={s}>
                  <mesh geometry={GEO.shoulderCap} material={m.jersey} position={[s * 0.238, 0.455, 0]} scale={[0.115, 0.075, 0.145]} castShadow />
                  <group position={[s * 0.275, 0.42, 0]} rotation={[sx, 0, s * sz]}>
                    <mesh geometry={GEO.sleeve} material={m.jersey} castShadow />
                    <mesh geometry={GEO.upperArm} material={skin} castShadow />
                    <group position-y={-0.3} rotation-x={elbow}>
                      <mesh geometry={GEO.forearm} material={skin} castShadow />
                      <mesh geometry={GEO.hand} material={SHARED.glove} position-y={-0.29} />
                    </group>
                  </group>
                </group>
              );
            })}
            <mesh geometry={GEO.neck} material={skin} position-y={0.6} />

            {/* Kopf – Körperbau-Skalierung wird hier aufgehoben */}
            <group position-y={0.63} rotation-x={pose.head} scale={[1 / bw, 1 / bh, 1 / bd]}>
              <group position-y={0.12} scale={[0.95, 1, 1.08]}>
                <mesh geometry={GEO.helmetCap} material={m.helmet} castShadow />
                <mesh geometry={GEO.helmetShell} material={m.helmet} castShadow />
                <mesh geometry={GEO.helmetInner} material={SHARED.inner} />
                <mesh geometry={GEO.visor} material={SHARED.visor} position={[0, -0.012, 0.062]} />
                <mesh geometry={GEO.stripe} material={m.stripe} rotation-y={Math.PI / 2} scale={[1, 1, 3.4]} />
                <group rotation-y={MASK_ARC / 2 - Math.PI / 2}>
                  {[-0.035, -0.078, -0.118].map((y, i) => (
                    <mesh key={y} geometry={GEO.maskBar} material={m.facemask} position-y={y} rotation-x={Math.PI / 2} scale={1 - i * 0.035} />
                  ))}
                </group>
                {[-0.045, 0.045].map((x) => (
                  <mesh key={x} geometry={GEO.maskPost} material={m.facemask} position={[x, -0.075, HELMET_R * 1.06]} />
                ))}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

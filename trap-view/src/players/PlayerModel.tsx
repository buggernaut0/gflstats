import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Build, Stance } from '../data/types';
import type { Kit } from '../data/kits';
import { GEO, HELMET_R, MASK_ARC } from './geometry';
import { FABRIC, GHOST, GHOST_KIT, GHOST_SHARED, SHARED, sheenOf, type KitMaterials } from './materials';
import { createJerseyTexture } from './numberTexture';
import { resolvePose, SHIN, THIGH } from './stances';

export interface PlayerModelProps {
  /** Weltposition der Füße (Yards). */
  position: [number, number, number];
  rotationY: number;
  /** Rückennummer aus dem offiziellen Kader, sonst null (Trikot ohne Nummer). */
  number: number | null;
  lastName: string | null;
  /** Unbesetzter Platz: nur eine durchscheinende Silhouette, ohne Name und Nummer. */
  ghost?: boolean;
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

/** Breite der Schulterpolster je Körperbau (Linemen tragen flachere, Skill-Spieler kompaktere Pads). */
const PAD: Record<Build, [number, number, number]> = {
  line: [0.17, 0.1, 0.2],
  big: [0.178, 0.112, 0.205],
  skill: [0.172, 0.108, 0.198],
};

/**
 * Stilisierter Football-Spieler aus geteilten Geometrien.
 * Lokales Koordinatensystem in Metern, Blick nach +Z. Austauschbar gegen ein
 * glTF-Modell, solange die Props-Schnittstelle erhalten bleibt.
 *
 * Aufbau: Körper (Becken, Beine, Torso, Arme, Hals) + Ausrüstung (Schulterpolster unter dem Trikot,
 * Kragen, Gürtel, Hose mit Knie-/Oberschenkelpolstern und Seitenstreifen, Socken mit Streifen, Spats,
 * Cleats mit Sohle, Handschuhe, Schweißbänder, Helm mit Jaw Pads, Ohröffnungen, Bumper, Kinnschale
 * und Facemask). Team- und Trikotdaten kommen ausschließlich über `kit`, `materials` und die Textur.
 */
export const PlayerModel = memo(function PlayerModel(props: PlayerModelProps) {
  const { position, rotationY, number, lastName, build, stance, kit, materials: kitMats, seed, ghost = false } = props;

  const pose = useMemo(() => resolvePose(stance), [stance]);
  const jersey = useMemo(() => {
    const map = createJerseyTexture(kit, number, lastName);
    // Trikotstoff mit Lochgewebe; leichte Eigenhelligkeit hält die Nummer auch im Körperschatten lesbar
    return new THREE.MeshPhysicalMaterial({
      map, roughness: 0.68, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.14,
      sheen: 0.3, sheenRoughness: 0.6, sheenColor: sheenOf(kit.jersey),
      bumpMap: FABRIC.jerseyTorso, bumpScale: 0.35,
    });
  }, [kit, number, lastName]);
  useEffect(() => () => {
    jersey.map?.dispose();
    jersey.dispose();
  }, [jersey]);

  const m: KitMaterials = ghost ? GHOST_KIT : kitMats;
  const sh = ghost ? GHOST_SHARED : SHARED;
  const skin = ghost ? GHOST : SHARED.skin[seed % SHARED.skin.length];
  const torso = ghost ? GHOST : jersey;
  const cs = !ghost; // Silhouetten werfen keine Schatten
  const [bw, bh, bd] = BUILD[build];
  const pad = PAD[build];

  return (
    <group position={position} rotation-y={rotationY} scale={UNIT}>
      <group scale={[bw, bh, bd]}>
        <group position={[0, pose.hipY, pose.hipZ]}>
          {/* Becken */}
          <mesh geometry={GEO.pelvis} material={m.pants} scale={[0.19, 0.135, 0.145]} castShadow={cs} />

          {/* Beine */}
          {[-1, 1].map((s, i) => {
            const [a, k] = pose.legs[i];
            return (
              <group key={s} position={[s * 0.105, -0.02, 0]} rotation={[-a, 0, s * pose.spread]}>
                <mesh geometry={GEO.thigh} material={m.pants} castShadow={cs} />
                {/* Seitenstreifen der Hose */}
                <mesh geometry={GEO.sideStripe} material={m.trim} position={[s * 0.119, -0.2, 0]} scale={[0.012, 0.34, 0.032]} />
                <group position-y={-THIGH} rotation-x={k}>
                  <mesh geometry={GEO.shin} material={m.socks} castShadow={cs} />
                  {/* Hosenbein bis unter das Knie, Kniepolster */}
                  <mesh geometry={GEO.pantsCuff} material={m.pants} castShadow={cs} />
                  <mesh geometry={GEO.kneePad} material={m.pants} position={[0, -0.04, 0.03]} scale={[0.066, 0.074, 0.05]} />
                  {/* Sockenstreifen und weiße Spats/Tape am Knöchel */}
                  <mesh geometry={GEO.band} material={m.trim} position-y={-0.155} scale={[0.079, 0.03, 0.079]} />
                  <mesh geometry={GEO.band} material={sh.tape} position-y={-0.365} scale={[0.056, 0.09, 0.056]} />
                  <group position-y={-SHIN} rotation={[a - k, 0, -s * pose.spread]}>
                    <mesh geometry={GEO.shoe} material={sh.shoe} position={[0, -0.02, 0.06]} scale={[0.058, 0.05, 0.135]} castShadow={cs} />
                    <mesh geometry={GEO.sole} material={sh.sole} position={[0, -0.058, 0.06]} scale={[0.064, 0.016, 0.148]} />
                  </group>
                </group>
              </group>
            );
          })}

          {/* Oberkörper */}
          <group rotation-x={pose.lean}>
            <mesh geometry={GEO.torso} material={torso} position-y={0.02} castShadow={cs} />
            {/* Gürtel und Kragen */}
            <mesh geometry={GEO.band} material={sh.belt} position-y={0.045} scale={[0.158, 0.04, 0.106]} />
            <mesh geometry={GEO.collar} material={m.trim} position-y={0.574} rotation-x={Math.PI / 2} scale={[0.09, 0.064, 0.09]} />

            {[-1, 1].map((s, i) => {
              const [sx, sz, elbow] = pose.arms[i];
              return (
                <group key={s}>
                  {/* Schulterpolster unter dem Trikot – prägt die Silhouette */}
                  <group position={[s * 0.185, 0.445, 0]} rotation-z={-s * 0.36} scale={pad}>
                    <mesh geometry={GEO.shoulderPad} material={m.jersey} castShadow={cs} />
                    <mesh geometry={GEO.padRim} material={m.jersey} position-y={-0.17} rotation-x={Math.PI / 2} scale={0.985} />
                  </group>
                  <group position={[s * 0.275, 0.42, 0]} rotation={[sx, 0, s * sz]}>
                    <mesh geometry={GEO.sleeve} material={m.jersey} castShadow={cs} />
                    {/* Ärmelstreifen */}
                    <mesh geometry={GEO.band} material={m.trim} position-y={-0.082} scale={[0.079, 0.014, 0.079]} />
                    <mesh geometry={GEO.band} material={m.trim} position-y={-0.106} scale={[0.079, 0.01, 0.079]} />
                    <mesh geometry={GEO.upperArm} material={skin} castShadow={cs} />
                    <group position-y={-0.3} rotation-x={elbow}>
                      <mesh geometry={GEO.forearm} material={skin} castShadow={cs} />
                      <mesh geometry={GEO.band} material={sh.tape} position-y={-0.215} scale={[0.043, 0.045, 0.043]} />
                      <mesh geometry={GEO.hand} material={sh.glove} position-y={-0.29} scale={[1, 1.2, 0.78]} />
                    </group>
                  </group>
                </group>
              );
            })}
            <mesh geometry={GEO.neck} material={skin} position-y={0.6} />

            {/* Kopf – Körperbau-Skalierung wird hier aufgehoben */}
            <group position-y={0.63} rotation-x={pose.head} scale={[1 / bw, 1 / bh, 1 / bd]}>
              <group position-y={0.12} scale={[0.95, 1, 1.08]}>
                <mesh geometry={GEO.helmetCap} material={m.helmet} castShadow={cs} />
                <mesh geometry={GEO.helmetShell} material={m.helmet} castShadow={cs} />
                <mesh geometry={GEO.helmetInner} material={sh.inner} />
                <mesh geometry={GEO.visor} material={sh.visor} position={[0, -0.012, 0.062]} />
                <mesh geometry={GEO.stripe} material={m.stripe} rotation-y={Math.PI / 2} scale={[1, 1, 3.4]} />
                {/* Jaw Pads, Ohröffnungen, Bumper, Kinnschale */}
                {[-1, 1].map((s) => (
                  <group key={s}>
                    <mesh geometry={GEO.jawPad} material={m.helmet} position={[s * 0.127, -0.078, 0.036]} scale={[0.032, 0.058, 0.062]} />
                    <mesh geometry={GEO.earHole} material={sh.inner} position={[s * HELMET_R * 1.004, -0.03, -0.006]} rotation-y={s * Math.PI / 2} />
                    <mesh geometry={GEO.maskClip} material={m.facemask} position={[s * 0.126, -0.042, 0.088]} rotation-y={s * 0.62} />
                  </group>
                ))}
                <mesh geometry={GEO.bumper} material={m.helmet} position={[0, -0.104, -0.134]} rotation-x={0.35} />
                <mesh geometry={GEO.chinCup} material={sh.tape} position={[0, -0.168, 0.108]} scale={[0.042, 0.028, 0.03]} />
                {/* Facemask: drei Querstreben, zwei Längsstreben, Mittelsteg zur Stirn */}
                <group rotation-y={MASK_ARC / 2 - Math.PI / 2}>
                  {[-0.035, -0.078, -0.118].map((y, i) => (
                    <mesh key={y} geometry={GEO.maskBar} material={m.facemask} position-y={y} rotation-x={Math.PI / 2} scale={1 - i * 0.035} />
                  ))}
                </group>
                {[-0.045, 0.045].map((x) => (
                  <mesh key={x} geometry={GEO.maskPost} material={m.facemask} position={[x, -0.075, HELMET_R * 1.06]} />
                ))}
                <mesh geometry={GEO.maskPost} material={m.facemask} position={[0, -0.016, HELMET_R * 1.09]} scale={[1, 0.4, 1]} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

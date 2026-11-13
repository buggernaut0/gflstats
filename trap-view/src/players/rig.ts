import * as THREE from 'three';
import type { Build, Stance } from '../data/types';
import { HEAD_JOINT, HELMET_CENTER, HELMET_R, HIP_X, SHIN, SHOULDER, THIGH, UPPER_ARM } from './parts';
import { resolvePose, type ResolvedPose } from './stances';

/** Die 13 starren Körperteile eines Spielers – je Teil ein InstancedMesh für alle Spieler. */
export const PART_NAMES = [
  'pelvis', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR',
  'torso', 'upperArmL', 'upperArmR', 'forearmL', 'forearmR', 'head',
] as const;
export type PartName = (typeof PART_NAMES)[number];

/** Meter → Yards, plus leichte Überhöhung für eine athletische Silhouette. */
export const UNIT = 1.0936 * 1.05;

/**
 * Körperbau: Umfang von Rumpf (Breite, Tiefe) und Gliedmaßen sowie Körpergröße. Schulter- und
 * Hüftgelenke wandern mit der Rumpfbreite – das Verhältnis Schulter : Brust bleibt bei jedem Bau gleich.
 */
const BUILD: Record<Build, { wide: number; deep: number; limb: number; tall: number }> = {
  skill: { wide: 1, deep: 1, limb: 1, tall: 1 },
  big: { wide: 1.07, deep: 1.1, limb: 1.08, tall: 1.01 },
  line: { wide: 1.16, deep: 1.32, limb: 1.18, tall: 1.02 },
};

/** Wie stark sich eine Haltung im Stand bewegt (tiefe Stances stehen ruhiger). */
const MOTION: Record<Stance, number> = {
  shotgun: 1, upright: 1, ready: 0.8, receiver: 0.7, lineSet: 0.5, threePoint: 0.35,
};

export interface Rig {
  root: THREE.Object3D;
  nodes: Record<PartName, THREE.Object3D>;
  chest: THREE.Object3D;
  arms: [THREE.Object3D, THREE.Object3D];
  head: THREE.Object3D;
  pose: ResolvedPose;
  /** individueller Takt, damit nicht alle Spieler synchron atmen */
  phase: number;
  motion: number;
}

export interface RigInput {
  world: [number, number, number];
  rotationY: number;
  stance: Stance;
  build: Build;
}

/** Baut das Skelett eines Spielers in seiner Haltung. Füße stehen flach auf dem Boden. */
export function buildRig(p: RigInput, seed: number): Rig {
  const pose = resolvePose(p.stance);
  const b = BUILD[p.build];
  const nodes = {} as Record<PartName, THREE.Object3D>;
  const node = (parent: THREE.Object3D, name?: PartName, girth?: [number, number]) => {
    const o = new THREE.Object3D();
    if (girth) o.scale.set(girth[0], 1, girth[1]);
    parent.add(o);
    if (name) nodes[name] = o;
    return o;
  };
  const limb: [number, number] = [b.limb, b.limb];

  const root = new THREE.Object3D();
  root.position.set(...p.world);
  root.rotation.y = p.rotationY;
  root.scale.setScalar(UNIT * b.tall);

  const hip = node(root);
  hip.position.set(0, pose.hipY, pose.hipZ);
  node(hip, 'pelvis', [b.wide, b.deep]);

  ([-1, 1] as const).forEach((s, i) => {
    const [a, k] = pose.legs[i];
    const L = s === -1 ? 'L' : 'R';
    const leg = node(hip);
    leg.position.set(s * HIP_X * b.wide, -0.02, 0);
    leg.rotation.set(-a, 0, s * pose.spread);
    node(leg, `thigh${L}`, limb);
    const knee = node(leg);
    knee.position.y = -THIGH;
    knee.rotation.x = k;
    node(knee, `shin${L}`, limb);
    const ankle = node(knee);
    ankle.position.y = -SHIN;
    // Fuß exakt waagerecht: Drehung von Bein und Knie aufheben, Fußspitze leicht nach außen
    ankle.quaternion
      .copy(leg.quaternion).multiply(knee.quaternion).invert()
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * 0.1));
    node(ankle, `foot${L}`);
  });

  const chest = node(hip);
  chest.rotation.x = pose.lean;
  node(chest, 'torso', [b.wide, b.deep]);

  const arms = ([-1, 1] as const).map((s, i) => {
    const [sx, sz, elbow] = pose.arms[i];
    const L = s === -1 ? 'L' : 'R';
    const arm = node(chest);
    arm.position.set(s * SHOULDER[0] * b.wide, SHOULDER[1], 0);
    arm.rotation.set(sx, 0, s * sz);
    node(arm, `upperArm${L}`, limb);
    const el = node(arm);
    el.position.y = -UPPER_ARM;
    el.rotation.x = elbow;
    node(el, `forearm${L}`, limb);
    return arm;
  }) as [THREE.Object3D, THREE.Object3D];

  const head = node(chest, 'head');
  head.position.set(...HEAD_JOINT);
  head.rotation.x = pose.head;

  const rig: Rig = { root, nodes, chest, arms, head, pose, phase: (seed * 2.399) % (Math.PI * 2), motion: MOTION[p.stance] };
  root.updateMatrixWorld(true);
  return rig;
}

/** Dezente Idle-Bewegung: Atmen im Brustkorb, mitschwingende Arme, ruhiger Blick. Füße bleiben stehen. */
export function animateRig(rig: Rig, t: number) {
  const { pose, phase, motion } = rig;
  const breath = Math.sin(t * 1.5 + phase);
  rig.chest.rotation.x = pose.lean + breath * 0.012 * motion;
  rig.chest.scale.set(1, 1 + breath * 0.005, 1 + breath * 0.014);
  rig.arms.forEach((arm, i) => {
    arm.rotation.x = pose.arms[i][0] + breath * 0.018 * motion;
  });
  rig.head.rotation.x = pose.head - breath * 0.012 * motion;
  rig.head.rotation.y = Math.sin(t * 0.37 + phase * 1.7) * 0.07 * motion;
  rig.root.updateMatrixWorld(true);
}

/** Weltposition knapp über dem Helm – dort sitzt das Label. */
export function labelAnchor(rig: Rig): THREE.Vector3 {
  const top = rig.nodes.head.localToWorld(new THREE.Vector3(...HELMET_CENTER));
  top.y += (HELMET_R + 0.09) * UNIT;
  return top;
}

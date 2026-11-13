import type { Stance } from '../data/types';
import { FOOT, SHIN, THIGH } from './parts';

/** Gelenkwinkel einer statischen Haltung (Bogenmaß). */
export interface Pose {
  /** Vorbeuge des Oberkörpers. */
  lean: number;
  /** Kopf-Ausgleich, damit der Blick nach vorn geht. */
  head: number;
  /** Seitliche Beinspreizung. */
  spread: number;
  /** [Oberschenkel nach vorn, Kniebeugung] – linkes und rechtes Bein. */
  legs: [[number, number], [number, number]];
  /** [Schulter vor/zurück, Abspreizen, Ellbogenbeugung] – linker und rechter Arm. */
  arms: [[number, number, number], [number, number, number]];
}

const POSES: Record<Stance, Pose> = {
  shotgun: {
    lean: 0.2, head: -0.12, spread: 0.12,
    legs: [[0.36, 0.62], [0.36, 0.62]],
    arms: [[-0.95, 0.05, -1.05], [-0.95, 0.05, -1.05]],
  },
  upright: {
    lean: 0.16, head: -0.1, spread: 0.1,
    legs: [[0.3, 0.52], [0.22, 0.4]],
    arms: [[-0.3, 0.14, -0.45], [-0.2, 0.14, -0.55]],
  },
  ready: {
    lean: 0.5, head: -0.42, spread: 0.16,
    legs: [[0.64, 1.08], [0.64, 1.08]],
    arms: [[-0.62, 0.16, -0.6], [-0.62, 0.16, -0.6]],
  },
  receiver: {
    lean: 0.52, head: -0.42, spread: 0.05,
    legs: [[0.78, 1.02], [0.05, 0]],
    arms: [[-0.15, 0.12, -0.95], [-0.6, 0.1, -0.9]],
  },
  lineSet: {
    lean: 0.5, head: -0.4, spread: 0.24,
    legs: [[0.86, 1.5], [0.86, 1.5]],
    arms: [[-0.5, 0.2, -0.42], [-0.5, 0.2, -0.42]],
  },
  threePoint: {
    lean: 1.12, head: -0.92, spread: 0.2,
    legs: [[1.22, 2.02], [1.0, 0]],
    arms: [[-0.62, 0.1, -1.25], [-1.32, 0.02, -0.06]],
  },
};

export interface ResolvedPose extends Pose {
  hipY: number;
  hipZ: number;
}

/**
 * Ergänzt die Haltung um Hüfthöhe und -versatz, sodass beide Füße flach auf dem Boden stehen.
 * Ist für ein Bein die Kniebeugung 0 angegeben, wird sie passend zur Hüfthöhe berechnet.
 */
export function resolvePose(stance: Stance): ResolvedPose {
  const p = POSES[stance];
  const cs = Math.cos(p.spread);
  const [a1, k1] = p.legs[0];
  const height = THIGH * Math.cos(a1) + SHIN * Math.cos(k1 - a1);
  const legs = p.legs.map(([a, k]) => {
    if (k !== 0) return [a, k];
    const c = THREE_clamp((height - THIGH * Math.cos(a)) / SHIN, -1, 1);
    return [a, a + Math.acos(c)];
  }) as Pose['legs'];
  const footZ = legs.map(([a, k]) => THIGH * Math.sin(a) - SHIN * Math.sin(k - a));
  return {
    ...p,
    legs,
    hipY: height * cs + FOOT,
    hipZ: -(footZ[0] + footZ[1]) / 2,
  };
}

function THREE_clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

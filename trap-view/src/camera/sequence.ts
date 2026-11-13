import * as THREE from 'three';
import type { SceneModel } from '../data/sceneModel';
import { resolveAnchor, resolveLabelIds, type AnchorSpec } from './anchors';

export type Ease = 'linear' | 'soft' | 'out';

/** Wie eine Einstellung beginnt: weiche Überblendung aus der vorherigen oder kurzer Abblend-Schnitt. */
export type Transition = { type: 'blend'; duration: number } | { type: 'dip' };

/** Eine Kameraeinstellung – rein deklarativ, ohne feste Koordinaten. */
export interface Shot {
  id: string;
  title: string;
  subtitle: string;
  /** Dauer in Sekunden. */
  duration: number;
  /** Kamerapfad: 2 Punkte = Gerade, mehr = Spline. */
  path: AnchorSpec[];
  /** Blickziel: 1 Punkt = fest, mehrere = wandert mit. */
  lookAt: AnchorSpec[];
  /** Field of View am Anfang und Ende (Grad). */
  fov: [number, number];
  ease: Ease;
  transition: Transition;
  /** Welche Spieler-Labels während der Einstellung sichtbar sind. */
  labels: string[];
}

export interface CameraPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

export function createPose(): CameraPose {
  return { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 35 };
}

interface CompiledShot {
  shot: Shot;
  start: number;
  path: THREE.Curve<THREE.Vector3>;
  look: THREE.Curve<THREE.Vector3> | THREE.Vector3;
  labelIds: string[];
}

export interface CompiledSequence {
  shots: CompiledShot[];
  duration: number;
}

function curveOf(points: THREE.Vector3[]): THREE.Curve<THREE.Vector3> {
  return points.length === 2
    ? new THREE.LineCurve3(points[0], points[1])
    : new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

/** Rechnet alle Anker einer Sequenz für die aktuelle Aufstellung in Weltkoordinaten um. */
export function compileSequence(shots: Shot[], model: SceneModel): CompiledSequence {
  let t = 0;
  const compiled = shots.map((shot) => {
    const pathPts = shot.path.map((a) => resolveAnchor(model, a));
    const lookPts = shot.lookAt.map((a) => resolveAnchor(model, a));
    const c: CompiledShot = {
      shot,
      start: t,
      path: curveOf(pathPts),
      look: lookPts.length === 1 ? lookPts[0] : curveOf(lookPts),
      labelIds: resolveLabelIds(model, shot.labels),
    };
    t += shot.duration;
    return c;
  });
  return { shots: compiled, duration: t };
}

const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

function ease(kind: Ease, x: number): number {
  if (kind === 'linear') return x;
  if (kind === 'out') return 1 - Math.pow(1 - x, 2.2);
  return x * 0.45 + smoother(x) * 0.55;
}

function poseOf(c: CompiledShot, local: number, out: CameraPose) {
  const u = ease(c.shot.ease, THREE.MathUtils.clamp(local / c.shot.duration, 0, 1));
  c.path.getPoint(u, out.pos);
  if (c.look instanceof THREE.Vector3) out.look.copy(c.look);
  else c.look.getPoint(u, out.look);
  out.fov = THREE.MathUtils.lerp(c.shot.fov[0], c.shot.fov[1], u);
}

const DIP = 0.42;
const prev = createPose();

/**
 * Liefert die Kamerapose zum Zeitpunkt `time`.
 * Rückgabe: Index der aktiven Einstellung und Abblendstärke (0–1) für Schnitt-Übergänge.
 */
export function evaluateSequence(seq: CompiledSequence, time: number, out: CameraPose) {
  const t = THREE.MathUtils.clamp(time, 0, seq.duration);
  let index = seq.shots.length - 1;
  for (let i = 0; i < seq.shots.length; i++) {
    if (t < seq.shots[i].start + seq.shots[i].shot.duration) {
      index = i;
      break;
    }
  }
  const cur = seq.shots[index];
  const local = t - cur.start;
  poseOf(cur, local, out);

  const tr = cur.shot.transition;
  if (index > 0 && tr.type === 'blend' && local < tr.duration) {
    const before = seq.shots[index - 1];
    poseOf(before, before.shot.duration, prev);
    const w = smoother(local / tr.duration);
    out.pos.lerpVectors(prev.pos, out.pos, w);
    out.look.lerpVectors(prev.look, out.look, w);
    out.fov = THREE.MathUtils.lerp(prev.fov, out.fov, w);
  }

  // Abblenden kurz vor und nach einem Schnitt
  let fade = 0;
  if (index > 0 && tr.type === 'dip') fade = Math.max(fade, 1 - local / DIP);
  const next = seq.shots[index + 1];
  if (next && next.shot.transition.type === 'dip') {
    fade = Math.max(fade, 1 - (cur.shot.duration - local) / DIP);
  }

  return { index, fade: THREE.MathUtils.clamp(fade, 0, 1) };
}

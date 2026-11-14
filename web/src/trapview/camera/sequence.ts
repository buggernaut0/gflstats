import * as THREE from 'three';
import type { SceneModel } from '../data/sceneModel';
import { resolveAnchor, resolveLabelIds, type AnchorSpec } from './anchors';

export type Ease = 'linear' | 'soft' | 'out';

/**
 * Wie eine Einstellung beginnt:
 *   blend – weiche Überblendung aus der Endpose der vorherigen
 *   dip   – kurzer Abblend-Schnitt
 *   flow  – nahtlose Weiterfahrt: der Pfad beginnt genau am Ende des vorherigen, mit gleicher
 *           Bewegungsrichtung und gleicher Geschwindigkeit. Der vorherige Pfad muss dazu an
 *           `path[0]` dieser Einstellung enden.
 */
export type Transition = { type: 'blend'; duration: number } | { type: 'dip' } | { type: 'flow' };

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
  /** Player Spotlight: Index in model.spotlights – die HUD zeigt währenddessen die Spielerkarte. */
  spotlight?: number;
}

export interface CameraPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

export function createPose(): CameraPose {
  return { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 35 };
}

/** Eine Einstellung auf der Zeitachse. Dieselbe Einstellung kann je Runde einmal vorkommen (andere Vorgängerin). */
interface Segment {
  /** Index in `shots` – für Kapitel und Labels */
  index: number;
  shot: Shot;
  start: number;
  prev: Segment | null;
  next: Segment | null;
  pose: (local: number, out: CameraPose) => void;
}

export interface CompiledSequence {
  shots: { shot: Shot; labelIds: string[] }[];
  /** Erste Runde: alle Einstellungen einmal, beginnend mit dem Einstieg. */
  first: Segment[];
  firstDuration: number;
  /** Ab hier wiederholt sich die Fahrt endlos (leer = kein Loop, die Sequenz endet). */
  loop: Segment[];
  loopDuration: number;
}

function curveOf(points: THREE.Vector3[]): THREE.Curve<THREE.Vector3> {
  return points.length === 2
    ? new THREE.LineCurve3(points[0], points[1])
    : new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

function ease(kind: Ease, x: number): number {
  if (kind === 'linear') return x;
  if (kind === 'out') return 1 - Math.pow(1 - x, 2.2);
  return x * 0.45 + smoother(x) * 0.55;
}

/** Steigung der Ease-Kurve am Anfang (0) bzw. Ende (1) – Geschwindigkeit relativ zum Mittelwert. */
function easeSlope(kind: Ease, end: 0 | 1): number {
  if (kind === 'linear') return 1;
  if (kind === 'out') return end === 0 ? 2.2 : 0;
  return 0.45;
}

/**
 * Weg-Zeit-Verlauf (beides normiert auf 0–1) als kubische Hermite-Kurve mit vorgegebener
 * Anfangs- und Endgeschwindigkeit a, b (relativ zur mittleren Geschwindigkeit). Für 0 ≤ a, b ≤ 3 monoton.
 */
function hermite(x: number, a: number, b: number): number {
  const x2 = x * x;
  const x3 = x2 * x;
  return 3 * x2 - 2 * x3 + a * (x3 - 2 * x2 + x) + b * (x3 - x2);
}

/**
 * Pfad einer nahtlos anschließenden Einstellung: Catmull-Rom durch die eigenen Punkte, an den Enden
 * zusätzlich durch den Nachbarpunkt der angrenzenden Einstellung. Dadurch ist die Tangente am
 * gemeinsamen Punkt auf beiden Seiten dieselbe (sie hängt nur von diesen drei Punkten ab).
 * Ausgewertet wird nach Bogenlänge, damit die Geschwindigkeit exakt steuerbar ist.
 */
class FlowPath {
  readonly length: number;
  private curve: THREE.CatmullRomCurve3;
  private t0: number;
  private t1: number;
  private table: Float32Array;

  constructor(points: THREE.Vector3[], before: THREE.Vector3 | null, after: THREE.Vector3 | null) {
    const all = [...(before ? [before] : []), ...points, ...(after ? [after] : [])];
    this.curve = new THREE.CatmullRomCurve3(all, false, 'centripetal');
    const seg = all.length - 1;
    this.t0 = before ? 1 / seg : 0;
    this.t1 = after ? (seg - 1) / seg : 1;
    const n = 240;
    this.table = new Float32Array(n + 1);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    this.curve.getPoint(this.t0, a);
    for (let i = 1; i <= n; i++) {
      this.curve.getPoint(this.t0 + ((this.t1 - this.t0) * i) / n, b);
      this.table[i] = this.table[i - 1] + a.distanceTo(b);
      a.copy(b);
    }
    this.length = this.table[n];
  }

  /** Punkt nach normierter Bogenlänge s (0–1). */
  at(s: number, out: THREE.Vector3) {
    const target = THREE.MathUtils.clamp(s, 0, 1) * this.length;
    const tab = this.table;
    let lo = 0;
    let hi = tab.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (tab[mid] < target) lo = mid;
      else hi = mid;
    }
    const span = tab[hi] - tab[lo];
    const f = (lo + (span > 0 ? (target - tab[lo]) / span : 0)) / (tab.length - 1);
    return this.curve.getPoint(this.t0 + (this.t1 - this.t0) * f, out);
  }
}

/**
 * Rechnet alle Anker einer Sequenz für die aktuelle Aufstellung in Weltkoordinaten um.
 * `loopFrom`: ID der Einstellung, ab der sich die Fahrt endlos wiederholt. Die letzte Einstellung
 * muss dann per `flow` in diese übergehen (ihr Pfad endet an deren Startpunkt).
 */
export function compileSequence(shots: Shot[], model: SceneModel, opts: { loopFrom?: string } = {}): CompiledSequence {
  const P = shots.map((s) => s.path.map((a) => resolveAnchor(model, a)));
  const Lk = shots.map((s) => s.lookAt.map((a) => resolveAnchor(model, a)));
  /** mittlere Geschwindigkeit jeder Einstellung (Yards/s) – Grundlage für den Geschwindigkeitsabgleich */
  const mean = P.map((pts, i) => curveOf(pts).getLength() / shots[i].duration);
  const loopAt = opts.loopFrom ? shots.findIndex((s) => s.id === opts.loopFrom) : -1;
  const last = shots.length - 1;

  const pose = (i: number, prevI: number | null, nextI: number | null): Segment['pose'] => {
    const s = shots[i];
    const flowIn = prevI !== null && s.transition.type === 'flow';
    const flowOut = nextI !== null && shots[nextI].transition.type === 'flow';
    const lookPts = Lk[i];
    const lookCurve = lookPts.length === 1 ? null : curveOf(lookPts);
    const lookAt = (u: number, out: THREE.Vector3) => (lookCurve ? lookCurve.getPoint(u, out) : out.copy(lookPts[0]));

    if (!flowIn && !flowOut) {
      const path = curveOf(P[i]);
      return (local, out) => {
        const u = ease(s.ease, THREE.MathUtils.clamp(local / s.duration, 0, 1));
        path.getPoint(u, out.pos);
        lookAt(u, out.look);
        out.fov = THREE.MathUtils.lerp(s.fov[0], s.fov[1], u);
      };
    }

    const path = new FlowPath(
      P[i],
      flowIn ? P[prevI!][P[prevI!].length - 2] : null,
      flowOut ? P[nextI!][1] : null,
    );
    // Geschwindigkeit am Übergang: beide Seiten rechnen mit demselben Wert, also stetig
    const v0 = flowIn ? Math.min(mean[prevI!], mean[i]) : easeSlope(s.ease, 0) * mean[i];
    const v1 = flowOut ? Math.min(mean[i], mean[nextI!]) : easeSlope(s.ease, 1) * mean[i];
    const k = s.duration / Math.max(path.length, 1e-6);
    const a = THREE.MathUtils.clamp(v0 * k, 0, 3);
    const b = THREE.MathUtils.clamp(v1 * k, 0, 3);
    return (local, out) => {
      const x = THREE.MathUtils.clamp(local / s.duration, 0, 1);
      path.at(hermite(x, a, b), out.pos);
      // Blickziel und Brennweite beginnen und enden in Ruhe – damit sind auch sie am Übergang stetig
      const w = smoother(x);
      lookAt(w, out.look);
      out.fov = THREE.MathUtils.lerp(s.fov[0], s.fov[1], w);
    };
  };

  const chain = (from: number, prevOfFirst: number | null): Segment[] => {
    let t = 0;
    const out: Segment[] = [];
    for (let i = from; i <= last; i++) {
      const prevI = i === from ? prevOfFirst : i - 1;
      const nextI = i < last ? i + 1 : loopAt >= 0 ? loopAt : null;
      const seg: Segment = { index: i, shot: shots[i], start: t, prev: out[out.length - 1] ?? null, next: null, pose: pose(i, prevI, nextI) };
      if (seg.prev) seg.prev.next = seg;
      out.push(seg);
      t += shots[i].duration;
    }
    return out;
  };

  const first = chain(0, null);
  const loop = loopAt >= 0 ? chain(loopAt, last) : [];
  // Rundenübergänge verknüpfen: Ende der ersten Runde → Loop, Ende des Loops → Loop-Anfang
  if (loop.length) {
    first[first.length - 1].next = loop[0];
    loop[loop.length - 1].next = loop[0];
    loop[0].prev = loop[loop.length - 1];
  }
  const total = (segs: Segment[]) => segs.reduce((t, s) => t + s.shot.duration, 0);

  return {
    shots: shots.map((shot) => ({ shot, labelIds: resolveLabelIds(model, shot.labels) })),
    first,
    firstDuration: total(first),
    loop,
    loopDuration: total(loop),
  };
}

const DIP = 0.42;
const prev = createPose();

/**
 * Liefert die Kamerapose zum Zeitpunkt `time` (Sekunden seit Beginn, bei Loop unbegrenzt).
 * Rückgabe: Index der aktiven Einstellung und Abblendstärke (0–1) für Schnitt-Übergänge.
 */
export function evaluateSequence(seq: CompiledSequence, time: number, out: CameraPose) {
  let list = seq.first;
  let t = THREE.MathUtils.clamp(time, 0, seq.firstDuration);
  if (seq.loop.length && time >= seq.firstDuration) {
    list = seq.loop;
    t = (time - seq.firstDuration) % seq.loopDuration;
  }
  let cur = list[list.length - 1];
  for (const s of list) {
    if (t < s.start + s.shot.duration) {
      cur = s;
      break;
    }
  }
  const local = t - cur.start;
  cur.pose(local, out);

  const tr = cur.shot.transition;
  if (cur.prev && tr.type === 'blend' && local < tr.duration) {
    cur.prev.pose(cur.prev.shot.duration, prev);
    const w = smoother(local / tr.duration);
    out.pos.lerpVectors(prev.pos, out.pos, w);
    out.look.lerpVectors(prev.look, out.look, w);
    out.fov = THREE.MathUtils.lerp(prev.fov, out.fov, w);
  }

  // Abblenden kurz vor und nach einem Schnitt
  let fade = 0;
  if (cur.prev && tr.type === 'dip') fade = Math.max(fade, 1 - local / DIP);
  if (cur.next && cur.next.shot.transition.type === 'dip') {
    fade = Math.max(fade, 1 - (cur.shot.duration - local) / DIP);
  }

  return { index: cur.index, fade: THREE.MathUtils.clamp(fade, 0, 1) };
}

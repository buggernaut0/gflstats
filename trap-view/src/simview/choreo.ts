/**
 * Choreografie der 2D-Wiedergabe: alle 22 Spieler je Spielzug.
 *
 * Grundlage ist das Ergebnis, das die Engine berechnet hat (wer wirft, wer fängt, wie weit, wer tackelt).
 * Die Bewegungen drumherum – Routen, Pass Rush, Blocks, Deckung, Verfolgung – sind Vorlagen, die zu
 * diesem Ergebnis passend gewählt werden. Sie sind Darstellung, keine Daten: Die Bögen enthalten weder
 * Laufwege noch Deckungszuordnungen.
 *
 * Lokale Koordinaten aus Sicht der Offense: x quer (negativ = links), y längs ab der Line of Scrimmage.
 */
import type { PlayEvent } from '../sim/types';
import { absOf, bannerOf, lateral, motionEnd, type Ctx, type Pt } from './playback.ts';
import type { Slot, TeamUnits } from './roster';

export interface Dot {
  key: string;
  team: string;
  at: Pt;
  id: string | null;
  name: string | null;
  number: number | null;
  pos: string;
  /** am Ausgang beteiligt (Passer, Ziel, Läufer, Tackler …) → Name wird gezeigt */
  involved: boolean;
  /** false = Platz laut Daten unbesetzt (Ring ohne Füllung) */
  filled: boolean;
}

export interface Scene {
  ball: Pt;
  height: number;
  dots: Dot[];
  banner: string | null;
  miss: Pt | null;
  flag: Pt | null;
}

export interface ChoreoCtx extends Ctx {
  units: Record<string, TeamUnits>;
  names: Map<string, { name: string; number: number | null }>;
}

// ── Hilfen ──
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const c01 = (x: number) => clamp(x, 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const P = (x: number, y: number): Pt => ({ x, y });
const mix = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const hash = (n: number) => { const s = Math.sin(n * 91.345 + 7.13) * 43758.5453; return s - Math.floor(s); };

/** Position auf einem Linienzug bei Anteil k (nach Länge). */
function along(pts: Pt[], k: number): Pt {
  if (pts.length === 1) return pts[0];
  const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = seg.reduce((a, b) => a + b, 0) || 1;
  let d = c01(k) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) return mix(pts[i], pts[i + 1], seg[i] ? c01(d / seg[i]) : 1);
    d -= seg[i];
  }
  return pts[pts.length - 1];
}

const LINE = new Set(['LT', 'LG', 'C', 'RG', 'RT', 'TE', 'DE1', 'DT1', 'DT2', 'DE2']);
/** 2D-Darstellung: enge Plätze an der Line etwas auseinanderziehen, damit sich die Punkte nicht überdecken. */
function base(s: Slot): Pt {
  const x = Math.abs(s.x) < 8 ? s.x * 1.6 : s.x;
  const y = LINE.has(s.role) ? s.y * 1.35 : s.y;
  return P(x, y);
}

/** Deckungszuordnung der Darstellung (Defense-Platz → Receiver-Platz). */
const COVER: Record<string, string> = { CB1: 'WR1', CB2: 'WR2', S1: 'WR3', LB3: 'TE', LB1: 'RB' };

const SNAP = 0.08;
const THROW = 0.4;
const CATCH = 0.58;

// ── Szene ──
export function sceneAt(e: PlayEvent, t: number, ctx: ChoreoCtx): Scene {
  const dir = e.offense === ctx.home ? 1 : -1;
  const los = absOf(e, ctx.home, e.yardLine);
  // Alles bleibt innerhalb der Endlinien (−10 / 110) und Seitenlinien
  const abs = (l: Pt): Pt => P(clamp(los + dir * l.y, -9.5, 109.5), clamp(dir * l.x, -26, 26));
  const m = ease(c01(t / motionEnd(e)));
  const done = t >= motionEnd(e);
  const lat = lateral(e);
  const toGoal = 100 - e.yardLine;
  const endY = clamp(e.endYardLine, -9, 109) - e.yardLine;
  const scene: Scene = { ball: abs(P(0, 0)), height: 0, dots: [], banner: done ? bannerOf(e) : null, miss: null, flag: null };
  const fullName = (team: string, id?: string | null) => (id ? ctx.names.get(`${team}|${id}`) ?? null : null);
  const last = (n: string) => n.split(' ').slice(-1)[0];

  const push = (team: string, key: string, l: Pt, s: Partial<Dot> & { pos: string }) =>
    scene.dots.push({ key: `${team}-${key}`, team, at: abs(l), id: null, name: null, number: null, involved: false, filled: true, ...s });

  if (e.type === 'kickoff' || e.type === 'punt') return kick(e, ctx, scene, { m, lat, abs, push, fullName, last, endY });
  if (e.type === 'fieldgoal' || e.type === 'pat') return fieldGoal(e, scene, { m, lat, abs, push, fullName, last, toGoal });

  // ── Scrimmage: Aufstellung + Wechsel für beteiligte Spieler ──
  const off = ctx.units[e.offense]?.offense.map((s) => ({ ...s })) ?? [];
  const def = ctx.units[e.defense]?.defense.map((s) => ({ ...s })) ?? [];
  const a = e.actors;
  const protectedIds = new Set(Object.values(a).filter(Boolean) as string[]);
  const place = (slots: Slot[], team: string, id: string | undefined, prefer: string[]) => {
    if (!id || slots.some((s) => s.id === id)) return;
    const slot = prefer.map((r) => slots.find((s) => s.role === r)).find((s) => s && !(s.id && protectedIds.has(s.id)));
    if (!slot) return;
    const n = fullName(team, id);
    slot.id = id; slot.name = n ? last(n.name) : id; slot.number = n?.number ?? null;
  };
  place(off, e.offense, a.passer, ['QB']);
  place(off, e.offense, a.target, ['WR3', 'WR2', 'WR1', 'TE', 'RB']);
  place(off, e.offense, a.rusher, ['RB', 'RB2', 'WR3']);
  if (e.type === 'sack') place(def, e.defense, a.defender, ['DE2', 'DE1', 'DT2', 'DT1', 'LB3']);
  else place(def, e.defense, a.defender, ['S1', 'CB1', 'CB2', 'S2', 'LB3']);
  place(def, e.defense, a.tackler, ['LB2', 'LB1', 'LB3', 'S2']);

  const offPos = new Map<string, Pt>();
  const defPos = new Map<string, Pt>();
  const slotOf = (slots: Slot[], id?: string) => (id ? slots.find((s) => s.id === id) : undefined);
  const involved = new Set<string>([a.passer, a.target, a.rusher, a.defender, a.tackler].filter(Boolean) as string[]);

  const kind: 'pass' | 'sack' | 'run' | 'still' = e.type === 'pass' ? 'pass' : e.type === 'sack' ? 'sack' : e.type === 'run' || e.type === 'twopoint' ? 'run' : 'still';
  const go = (from: number, span: number) => c01((m - from) / span);

  // ── Ballweg / Schlüsselpunkte ──
  const tSlot = slotOf(off, a.target);
  const air = clamp(e.airYards ?? 8, -2, toGoal + 8);
  const catchL = P(clamp((tSlot ? base(tSlot).x : lat * 10) * 0.7 + lat * 5, -24, 24), air);
  const isComplete = e.outcome === 'complete' || e.outcome === 'touchdown' || e.outcome === 'fumble_lost' || e.outcome === 'fumble_kept';
  const endL = kind === 'pass'
    ? P(clamp(catchL.x * 0.85 + lat * 3, -24, 24), e.outcome === 'touchdown' ? toGoal + 2 : endY)
    : P(clamp(lat * 9, -22, 22), e.outcome === 'touchdown' ? toGoal + 2 : endY);
  const intBack = ctx.nextStartAbs != null ? dir * (ctx.nextStartAbs - los) : catchL.y;
  const qbSlot = off.find((s) => s.role === 'QB');
  const qbBase = qbSlot ? base(qbSlot) : P(0, -5.4);
  const qbL = kind === 'sack'
    ? (m < 0.3 ? mix(qbBase, P(0, -7.5), go(SNAP, 0.22)) : m < 0.75 ? P(Math.sin(m * 18) * 0.6, -7.5) : mix(P(0, -7.5), P(lat * 2, endY), go(0.75, 0.25)))
    : kind === 'pass' ? mix(qbBase, P(0, -7), go(SNAP, THROW - SNAP))
      : kind === 'run' ? mix(qbBase, P(-1.5, -5.5), go(SNAP, 0.3)) : qbBase;

  // Laufweg des Ballträgers (Lauf)
  const rSlot = slotOf(off, a.rusher);
  const holeX = clamp(lat * 4, -6, 6);
  const runPath = (start: Pt): Pt[] => (e.yards < 0 || e.outcome === 'fumble_lost' && e.yards <= 0)
    ? [start, P(0.8, -4), endL]
    : [start, P(0.8, -4), P(holeX, 0.5), endL];
  const carrierL = rSlot ? (rSlot.role === 'QB' ? along([qbBase, P(holeX * 0.5, -2), P(holeX, 0.5), endL], go(SNAP, 1 - SNAP)) : along(runPath(base(rSlot)), go(SNAP, 1 - SNAP))) : null;

  // Ball
  let ballL: Pt = P(0, 0);
  if (kind === 'still') ballL = P(0, 0);
  else if (kind === 'sack') ballL = m < SNAP ? P(0, 0) : qbL;
  else if (kind === 'run') ballL = m < SNAP ? P(0, 0) : carrierL && m > 0.18 ? carrierL : qbL;
  else if (e.outcome === 'throwaway') {
    const side = P(lat >= 0 ? 27 : -27, 8);
    if (m < SNAP) ballL = P(0, 0);
    else if (m < THROW) ballL = qbL;
    else { const k = go(THROW, 0.3); ballL = mix(qbL, side, k); scene.height = Math.sin(Math.PI * k) * 0.6; }
  } else if (m < SNAP) ballL = P(0, 0);
  else if (m < THROW) ballL = qbL;
  else if (m < CATCH) { const k = go(THROW, CATCH - THROW); ballL = mix(P(0, -7), catchL, k); scene.height = Math.sin(Math.PI * k) * 0.65; }
  else if (isComplete) ballL = mix(catchL, endL, go(CATCH, 1 - CATCH));
  else if (e.outcome === 'interception') ballL = mix(catchL, P(catchL.x * 0.6, intBack), go(CATCH, 1 - CATCH));
  else { ballL = add(catchL, P(lat * 1.5 * go(CATCH, 0.4), 1.5 * go(CATCH, 0.4))); scene.miss = abs(catchL); }

  // ── Offense ──
  const routes: Record<number, (s: Pt) => Pt[]> = {
    0: (s) => [s, P(s.x * 0.95, 22)], // Go
    1: (s) => [s, P(s.x, 4), P(s.x * 0.45, 10)], // Slant
    2: (s) => [s, P(s.x, 7), P(s.x + Math.sign(s.x || 1) * 6, 7)], // Out
    3: (s) => [s, P(s.x, 11), P(s.x * 0.92, 8.5)], // Curl
    4: (s) => [s, P(s.x, 10), P(s.x * 0.35, 20)], // Post
  };
  off.forEach((s, i) => {
    const b = base(s);
    let p = b;
    const isTarget = !!s.id && s.id === a.target;
    if (s.role === 'QB') p = qbL;
    else if (rSlot && s === rSlot && kind === 'run') p = carrierL ?? b;
    else if (kind === 'still') p = b;
    else if (['LT', 'LG', 'C', 'RG', 'RT'].includes(s.role)) {
      p = kind === 'run'
        ? mix(b, P(b.x + (holeX - b.x) * 0.15, 1.4), go(SNAP, 0.3))
        : mix(b, P(b.x * 0.95, -2.4), go(SNAP, 0.25));
      if (kind === 'sack' && m > 0.5) p = add(p, P(0, -0.8 * go(0.5, 0.3)));
    } else if (kind === 'run') {
      p = mix(b, P(b.x * 0.9, s.role.startsWith('RB') || s.role === 'TE' ? 1.5 : 5), go(SNAP, 0.6)); // Blocken
    } else if (isTarget) {
      const brk = P(b.x + (catchL.x - b.x) * 0.25, Math.max(catchL.y - 4, Math.min(catchL.y, 3)));
      p = m < CATCH ? along([b, brk, catchL], go(SNAP, CATCH - SNAP)) : isComplete ? ballL : catchL;
    } else if ((s.role === 'RB' || s.role === 'RB2' || s.role === 'TE') && hash(e.index + i) < 0.55) {
      p = mix(b, P(b.x * 0.5 + 1.2, s.role === 'TE' ? -1.2 : -4.8), go(SNAP, 0.2)); // Pass Protection
    } else {
      const r = routes[Math.floor(hash(e.index * 3 + i) * 5)] ?? routes[0];
      p = along(r(b), go(SNAP, 1 - SNAP) * 1.1);
    }
    offPos.set(s.role, p);
  });

  // ── Defense ──
  const recNow = (role: string) => offPos.get(role);
  const carrierNow = kind === 'pass' && isComplete && m >= CATCH ? ballL : kind === 'run' ? (carrierL ?? ballL) : null;
  def.forEach((s, i) => {
    const b = base(s);
    let p = b;
    const isDL = s.role.startsWith('DE') || s.role.startsWith('DT');
    const isLB = s.role.startsWith('LB');
    if (kind === 'still') p = b;
    else if (kind === 'run') {
      if (isDL) p = mix(b, P(b.x + (holeX - b.x) * 0.25, 0.4), go(SNAP, 0.3));
      else {
        const target = add(carrierL ?? ballL, P((i % 3 - 1) * 1.6, 2));
        p = mix(b, target, (isLB ? go(SNAP, 0.8) : go(0.35, 0.65)) * 0.75);
      }
    } else {
      // Pass / Sack: Rush, Zonen, Deckung
      if (isDL) p = add(mix(b, P(b.x * 0.75, -0.7), go(SNAP, 0.25)), P(Math.sin(m * 22 + i) * 0.25, 0));
      else if (COVER[s.role] && (recNow(COVER[s.role])?.y ?? -1) > 0.5) {
        // Mann-Deckung auf den zugeordneten Receiver (nur wenn er eine Route läuft, nicht beim Blocken)
        const rec = recNow(COVER[s.role])!;
        const cover = add(rec, P(-Math.sign(rec.x || 1) * 1.0, 1.6));
        p = mix(b, cover, go(SNAP, 0.18));
      } else if (isLB) p = mix(b, P(b.x * 1.6, 9), go(SNAP, 0.35));
      else p = mix(b, P(catchL.x * 0.5, Math.max(catchL.y + 6, 14)), go(SNAP, CATCH)); // tiefer Safety
      // Verfolgung nach dem Catch
      if (carrierNow) p = mix(p, add(carrierNow, P((i % 4 - 1.5) * 1.4, 1.5)), go(CATCH, 1 - CATCH) * 0.55);
    }
    // Beteiligte Verteidiger
    if (s.id && s.id === a.defender) {
      if (kind === 'sack') p = m < 0.75 ? mix(b, qbL, go(SNAP, 0.75 - SNAP)) : add(qbL, P(0.6, 0.6));
      else if (kind === 'pass') p = m < CATCH ? mix(p, add(catchL, P(0.6, 0.9)), go(0.25, CATCH - 0.25)) : e.outcome === 'interception' ? ballL : add(catchL, P(0.6, 0.9));
      else p = mix(p, add(endL, P(0.9, 0.9)), go(0.5, 0.5)); // Fumble erzwungen
    }
    if (s.id && s.id === a.tackler) p = mix(p, add(endL, P(0.8, 1.0)), go(kind === 'run' ? 0.45 : CATCH, kind === 'run' ? 0.55 : 1 - CATCH));
    defPos.set(s.role, p);
  });

  if (e.type === 'penalty') scene.flag = abs(P(lat * 6, 0.5));
  if (e.type === 'twopoint') ballL = mix(P(0, 0), P(lat * 4, e.outcome === 'two_good' ? toGoal + 2 : toGoal - 1), go(SNAP, 1 - SNAP));

  const dotOf = (team: string, s: Slot, p: Pt) => push(team, s.role, p, {
    id: s.id, name: s.name, number: s.number, pos: s.pos, filled: !!s.id,
    involved: !!s.id && (involved.has(s.id) || (s.role === 'QB' && kind === 'pass')),
  });
  off.forEach((s) => dotOf(e.offense, s, offPos.get(s.role)!));
  def.forEach((s) => dotOf(e.defense, s, defPos.get(s.role)!));
  scene.ball = abs(ballL);
  return scene;
}

// ── Special Teams (Besetzung steht nicht in den Daten: Punkte ohne Namen, außer Kicker/Returner) ──
interface Kit {
  m: number; lat: number; abs: (l: Pt) => Pt;
  push: (team: string, key: string, l: Pt, s: Partial<Dot> & { pos: string }) => void;
  fullName: (team: string, id?: string | null) => { name: string; number: number | null } | null;
  last: (n: string) => string;
}

function named(k: Kit, team: string, id: string | undefined) {
  const n = k.fullName(team, id);
  return { id: id ?? null, name: n ? k.last(n.name) : null, number: n?.number ?? null, involved: !!id };
}

function kick(e: PlayEvent, ctx: ChoreoCtx, scene: Scene, k: Kit & { endY: number }): Scene {
  void ctx;
  const { m, lat, push } = k;
  const g = (from: number, span: number) => c01((m - from) / span);
  const punt = e.type === 'punt';
  const dist = e.kickDistance ?? 40;
  const land = P(lat * 8, dist);
  const td = e.outcome === 'kickoff_return_td' || e.outcome === 'punt_return_td';
  const retEnd = P(lat * 4, td ? -12 : k.endY);
  const KICK_START = punt ? 0.12 : 0.05;
  const LAND = 0.6;
  const kickFrom = punt ? P(0, -13) : P(0, -1);

  // Ball
  if (m < KICK_START) scene.ball = k.abs(punt ? mix(P(0, 0), kickFrom, g(0, KICK_START)) : P(0, 0));
  else if (m < LAND) { const q = g(KICK_START, LAND - KICK_START); scene.ball = k.abs(mix(kickFrom, land, q)); scene.height = Math.sin(Math.PI * q); }
  else scene.ball = k.abs(mix(land, retEnd, g(LAND, 1 - LAND)));
  const ballL = m < LAND ? land : mix(land, retEnd, g(LAND, 1 - LAND));

  // Kickendes Team
  push(e.offense, 'K', m < KICK_START + 0.05 ? kickFrom : mix(kickFrom, add(kickFrom, P(0, 10)), g(KICK_START, 0.5)), { pos: 'K', ...named(k, e.offense, e.actors.kicker) });
  for (let i = 0; i < 10; i++) {
    const x = punt ? [-22, 22, -6, -4, -2, 0, 2, 4, 6, 0][i] : (i < 5 ? -22 + i * 4.4 : 4.4 + (i - 5) * 4.4);
    const y = punt ? (i === 9 ? -6 : i < 2 ? -1 : -1.3) : -1;
    const start = P(x, y);
    const release = punt ? (i < 2 ? KICK_START : 0.35) : KICK_START;
    const cover = add(ballL, P(x * 0.45, -4 - (i % 3) * 1.5));
    push(e.offense, `C${i}`, mix(start, cover, ease(g(release, 1 - release)) * 0.92), { pos: punt && i === 4 ? 'LS' : '' });
  }
  // Empfangendes Team
  const ret = named(k, e.defense, e.actors.returner);
  push(e.defense, 'R', m < LAND ? land : ballL, { pos: 'R', ...ret, involved: !!e.actors.returner });
  for (let i = 0; i < 10; i++) {
    const x = punt ? [-21, 21, -6, -3.6, -1.2, 1.2, 3.6, 6, 0, -9][i] : (i < 5 ? -18 + i * 7.2 : -14.4 + (i - 5) * 7.2);
    const y = punt ? (i < 2 ? 1.5 : i === 8 ? 10 : i === 9 ? 6 : 1.4) : dist - 14 - (i >= 5 ? 6 : 0);
    const start = P(x, y);
    const target = punt
      ? (i < 2 ? add(ballL, P(x * 0.2, 4)) : mix(start, P(x * 0.8, -3), 0.6))
      : add(ballL, P(x * 0.55, -7 + (i % 2) * 2.5));
    push(e.defense, `B${i}`, mix(start, target, ease(g(punt && i >= 2 ? SNAP : 0.3, 0.7)) * 0.85), { pos: '' });
  }
  return scene;
}

function fieldGoal(e: PlayEvent, scene: Scene, k: Kit & { toGoal: number }): Scene {
  const { m, lat, push } = k;
  const g = (from: number, span: number) => c01((m - from) / span);
  const hold = P(0, -7);
  const good = e.outcome === 'fg_good' || e.outcome === 'pat_good';
  for (let i = 0; i < 9; i++) {
    const x = i < 7 ? -4.8 + i * 1.6 : i === 7 ? -6.4 : 6.4;
    push(e.offense, `L${i}`, P(x, i < 7 ? -1.3 : -2.2), { pos: '' });
  }
  push(e.offense, 'H', hold, { pos: 'H' });
  push(e.offense, 'K', mix(P(-2, -9.5), P(-0.4, -7.5), g(SNAP, 0.25)), { pos: 'K', ...named(k, e.offense, e.actors.kicker) });
  for (let i = 0; i < 11; i++) {
    const x = i < 9 ? -6.4 + i * 1.6 : i === 9 ? -9 : 9;
    const start = P(x, i < 9 ? 1.4 : 7);
    push(e.defense, `R${i}`, mix(start, P(x * 0.8, i < 9 ? -0.4 : 5), g(SNAP, 0.3)), { pos: '' });
  }
  if (m < SNAP) scene.ball = k.abs(P(0, 0));
  else if (m < 0.25) scene.ball = k.abs(mix(P(0, 0), hold, g(SNAP, 0.25 - SNAP)));
  else {
    const q = g(0.25, 0.7);
    scene.ball = k.abs(mix(hold, P(good ? 0 : (lat >= 0 ? 6 : -6), k.toGoal + 10), q));
    scene.height = Math.sin(Math.PI * q * 0.9) * 0.9;
  }
  return scene;
}

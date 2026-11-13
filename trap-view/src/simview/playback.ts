/**
 * Simulator-Wiedergabe – reine Funktionen: wie lange ein Ereignis gezeigt wird und wo Ball und
 * beteiligte Spieler zu einem Zeitpunkt t ∈ [0, 1] stehen.
 *
 * Die Bewegung folgt dem Ergebnis, das die Engine berechnet hat – sie ist Darstellung, keine Physik.
 * Koordinaten: x = Yards ab der linken Goal Line (0–100, Endzonen −10 … 110), y = Yards quer zur Mitte.
 * Team „home“ spielt immer nach rechts.
 */
import type { PlayEvent } from '../sim/types';

export type Speed = 1 | 2 | 4 | 'highlights';

/**
 * Dauer bei Tempo 1 in Millisekunden (Bewegung + Standbild zum Lesen).
 * Ausgelegt aufs Zuschauen: ein normaler Spielzug ist knapp 1 s in Bewegung (vorher 0,2 s) und steht
 * danach kurz; Schlüsselspielzüge (TD, Turnover, Sack, Big Play, 4th Down) bewegen sich fast 2 s und
 * bleiben dann mit Banner stehen. Ein ganzes Spiel (~145 Ereignisse) dauert so rund 4 Minuten;
 * 2×/4× und „Highlights“ kürzen ab.
 */
export function eventDuration(e: PlayEvent, speed: Speed): number {
  let ms: number;
  if (e.key) ms = 3800;
  else if (e.type === 'kickoff' || e.type === 'punt') ms = 2000;
  else if (e.type === 'pat' || e.type === 'twopoint') ms = 1200;
  else if (e.type === 'penalty') ms = 1000;
  else ms = 1250;
  if (speed === 'highlights') return e.key || e.points ? ms : 120;
  return ms / speed;
}

/** Anteil der Dauer mit Bewegung; danach steht das Bild (Ergebnis/Banner zum Lesen). */
export const motionEnd = (e: PlayEvent) => (e.key ? 0.5 : 0.72);

export interface Pt { x: number; y: number }
export interface Actor { id: string; team: string; at: Pt; role: string }
export interface Frame {
  ball: Pt;
  /** 0 = am Boden, 1 = höchster Punkt (für Schatten/Größe) */
  height: number;
  actors: Actor[];
  banner: string | null;
  /** Stelle eines nicht gefangenen Passes */
  miss: Pt | null;
  flag: Pt | null;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/** Wiederholbare seitliche Versetzung je Spielzug (−1 … 1). */
export function lateral(e: PlayEvent) {
  const s = Math.sin(e.index * 12.9898 + e.quarter * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

export interface Ctx {
  home: string;
  /** Ballposition (absolut) zu Beginn des nächsten Ereignisses – Ziel eines Returns nach Turnover */
  nextStartAbs: number | null;
}

export const absOf = (e: PlayEvent, home: string, yl: number) => (e.offense === home ? yl : 100 - yl);

export function bannerOf(e: PlayEvent): string | null {
  switch (e.outcome) {
    case 'touchdown': return 'TOUCHDOWN';
    case 'kickoff_return_td': case 'punt_return_td': return 'RETURN TOUCHDOWN';
    case 'interception': return e.points ? 'PICK SIX' : 'INTERCEPTION';
    case 'fumble_lost': return e.points ? 'FUMBLE RETURN TD' : 'FUMBLE';
    case 'sack': return 'SACK';
    case 'safety': return 'SAFETY';
    case 'fg_good': return 'FIELD GOAL';
    case 'fg_missed': return 'FIELD GOAL VERFEHLT';
  }
  if (e.turnover && (e.type === 'pass' || e.type === 'run')) return 'TURNOVER ON DOWNS';
  if (e.key && e.yards >= 20) return `+${e.yards} YARDS`;
  return null;
}

export function frameAt(e: PlayEvent, t: number, ctx: Ctx): Frame {
  const dir = e.offense === ctx.home ? 1 : -1;
  const X = (yl: number) => absOf(e, ctx.home, yl);
  const los = X(e.yardLine);
  const end = X(clamp(e.endYardLine, -9, 109));
  const lat = lateral(e);
  const m = ease(clamp(t / motionEnd(e), 0, 1));
  const done = t >= motionEnd(e);
  const actors: Actor[] = [];
  const off = e.offense, def = e.defense;
  const f: Frame = { ball: { x: los, y: 0 }, height: 0, actors, banner: done ? bannerOf(e) : null, miss: null, flag: null };
  const add = (id: string | undefined, team: string, at: Pt, role: string) => { if (id) actors.push({ id, team, at, role }); };
  const arc = (a: Pt, b: Pt, k: number, peak: number) => { f.ball = lerpPt(a, b, k); f.height = peak * Math.sin(Math.PI * k); };

  switch (e.type) {
    case 'pass': {
      const qb = { x: los - dir * 6, y: 0 };
      add(e.actors.passer, off, qb, 'QB');
      if (e.outcome === 'throwaway') {
        arc(qb, { x: los + dir * 10, y: lat >= 0 ? 27 : -27 }, m, 0.5);
        break;
      }
      const air = e.airYards ?? 8;
      const catchPt = { x: X(clamp(e.yardLine + air, 1, 109)), y: lat * 16 };
      const start = { x: los, y: lat * 22 };
      const k1 = clamp(m / 0.5, 0, 1);
      if (e.outcome === 'complete' || e.outcome === 'touchdown' || e.outcome === 'fumble_lost' || e.outcome === 'fumble_kept') {
        const endPt = { x: end, y: lat * 10 };
        if (m < 0.5) {
          arc(qb, catchPt, k1, 0.6);
          add(e.actors.target, off, lerpPt(start, catchPt, k1), 'REC');
        } else {
          f.ball = lerpPt(catchPt, endPt, (m - 0.5) / 0.5);
          add(e.actors.target, off, f.ball, 'REC');
        }
        if (e.actors.tackler) add(e.actors.tackler, def, lerpPt({ x: catchPt.x + dir * 6, y: catchPt.y - 6 * Math.sign(lat || 1) }, endPt, m), 'DEF');
        if (e.outcome === 'fumble_lost' && e.actors.defender) add(e.actors.defender, def, lerpPt({ x: endPt.x + dir * 4, y: endPt.y + 3 }, endPt, m), 'DEF');
        break;
      }
      if (e.outcome === 'interception') {
        const back = ctx.nextStartAbs ?? catchPt.x;
        if (m < 0.5) arc(qb, catchPt, k1, 0.6);
        else f.ball = lerpPt(catchPt, { x: back, y: catchPt.y * 0.6 }, (m - 0.5) / 0.5);
        add(e.actors.target, off, lerpPt(start, catchPt, Math.min(k1, 0.95)), 'REC');
        add(e.actors.defender, def, m < 0.5 ? lerpPt({ x: catchPt.x + dir * 5, y: catchPt.y + 4 }, catchPt, k1) : f.ball, 'DEF');
        break;
      }
      // nicht gefangen (unvollständig, Drop, abgewehrt)
      arc(qb, catchPt, clamp(m / 0.6, 0, 1), 0.6);
      if (m >= 0.6) { f.ball = { x: catchPt.x + dir * 2 * (m - 0.6), y: catchPt.y + 2 * (m - 0.6) }; f.height = 0; f.miss = catchPt; }
      add(e.actors.target, off, lerpPt(start, catchPt, Math.min(k1, 1)), 'REC');
      if (e.actors.defender) add(e.actors.defender, def, lerpPt({ x: catchPt.x + dir * 4, y: catchPt.y + 3 }, { x: catchPt.x + dir * 0.8, y: catchPt.y + 0.8 }, k1), 'DEF');
      break;
    }
    case 'sack': {
      const qb = lerpPt({ x: los - dir * 4, y: 0 }, { x: end, y: lat * 3 }, m);
      f.ball = qb;
      add(e.actors.passer, off, qb, 'QB');
      add(e.actors.defender, def, lerpPt({ x: los + dir * 1, y: lat * 6 }, { x: qb.x + dir * 0.8, y: qb.y + 0.6 }, m), 'DEF');
      break;
    }
    case 'run': {
      const from = { x: los - dir * 4, y: 0 };
      const to = { x: end, y: lat * 8 };
      f.ball = lerpPt(from, to, m);
      add(e.actors.rusher, off, f.ball, 'RB');
      if (e.actors.tackler) add(e.actors.tackler, def, lerpPt({ x: los + dir * 5, y: -lat * 6 }, { x: to.x + dir * 0.8, y: to.y + 0.6 }, m), 'DEF');
      if (e.outcome === 'fumble_lost' && e.actors.defender) add(e.actors.defender, def, lerpPt({ x: to.x + dir * 4, y: to.y - 3 }, to, m), 'DEF');
      break;
    }
    case 'kickoff':
    case 'punt': {
      const land = { x: X(clamp(e.yardLine + (e.kickDistance ?? 40), 0, 108)), y: lat * 8 };
      const kickFrom = { x: los - dir * (e.type === 'punt' ? 13 : 0), y: 0 };
      const kickEnd = e.outcome === 'kickoff_return_td' || e.outcome === 'punt_return_td' ? X(-2) : end;
      if (m < 0.6) arc(kickFrom, land, m / 0.6, 1);
      else {
        f.ball = lerpPt(land, { x: kickEnd, y: lat * 4 }, (m - 0.6) / 0.4);
        add(e.actors.returner, def, f.ball, 'KR');
      }
      add(e.actors.kicker, off, kickFrom, 'K');
      break;
    }
    case 'fieldgoal':
    case 'pat': {
      const hold = { x: los - dir * 7, y: 0 };
      const good = e.outcome === 'fg_good' || e.outcome === 'pat_good';
      arc(hold, { x: X(110), y: good ? 0 : (lat >= 0 ? 6 : -6) }, m, 0.9);
      add(e.actors.kicker, off, hold, 'K');
      break;
    }
    case 'twopoint': {
      const good = e.outcome === 'two_good';
      f.ball = lerpPt({ x: los - dir * 5, y: 0 }, { x: X(good ? 102 : 99), y: lat * 6 }, m);
      break;
    }
    case 'penalty': {
      f.flag = { x: los, y: lat * 8 };
      f.ball = lerpPt({ x: los, y: 0 }, { x: end, y: 0 }, m);
      break;
    }
  }
  return f;
}

/** Feldposition in Football-Schreibweise, z. B. „RAV 29“ oder „POT 35“ (50 = Mittellinie). */
export function spotLabel(yl: number, offAbbr: string, defAbbr: string) {
  const y = Math.round(yl);
  if (y === 50) return '50';
  return y < 50 ? `${offAbbr} ${y}` : `${defAbbr} ${100 - y}`;
}

export const ordinal = (d: number) => ['', '1st', '2nd', '3rd', '4th'][d] ?? `${d}th`;

export const clockLabel = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

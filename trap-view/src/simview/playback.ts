/**
 * Simulator-Wiedergabe – reine Funktionen: wie lange ein Ereignis gezeigt wird, Banner, Beschriftungen.
 * Wo Ball und Spieler zu einem Zeitpunkt t ∈ [0, 1] stehen, berechnet choreo.ts.
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

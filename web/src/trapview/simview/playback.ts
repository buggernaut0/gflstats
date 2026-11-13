/**
 * Simulator-Wiedergabe – reine Funktionen: wie lange ein Ereignis gezeigt wird, Banner, Beschriftungen.
 * Wo Ball und Spieler zu einem Zeitpunkt t ∈ [0, 1] stehen, berechnet choreo.ts.
 *
 * Die Bewegung folgt dem Ergebnis, das die Engine berechnet hat – sie ist Darstellung, keine Physik.
 * Koordinaten: x = Yards ab der linken Goal Line (0–100, Endzonen −10 … 110), y = Yards quer zur Mitte.
 * Team „home“ spielt immer nach rechts.
 */
import type { PlayEvent } from '../sim/types';

/** Wiedergabemodi: 1 = Normal, 2/4 = schneller, „highlights“ = nur ausgewählte Szenen in Normaltempo. */
export type Speed = 1 | 2 | 4 | 'highlights';

/**
 * Ablauf eines Ereignisses (Anteile von t ∈ [0, 1]):
 *   0 … motionStart     Aufstellung steht (Formation lesen, Down & Distance)
 *   motionStart … motionEnd   Spielzug läuft (Snap, Routen, Pass, Tackle)
 *   motionEnd … 1       Standbild mit Ergebnis/Banner zum Lesen
 *
 * Dauer bei Normaltempo in Millisekunden. Ausgelegt aufs Zuschauen wie in einer TV-Übertragung bzw.
 * dem Zuschauermodus von Football-Simulationen: ein normaler Spielzug ist gut 3 s in Bewegung (vorher
 * knapp 1 s), vorher steht die Formation, danach bleibt das Ergebnis 1,5 s stehen. Schlüsselspielzüge
 * (TD, Turnover, Sack, Big Play, 4th Down) laufen fast 4 s und bleiben mit Banner über 3 s stehen.
 * Ein ganzes Spiel (~145 Ereignisse) dauert so rund 13 Minuten; 2× und 4× kürzen gleichmäßig,
 * „Highlights“ zeigt nur die ausgewählten Szenen (siehe highlightReason) in Normaltempo.
 */
const TIMING: Record<'key' | 'kick' | 'fieldgoal' | 'pat' | 'twopoint' | 'penalty' | 'play', { ms: number; start: number; end: number }> = {
  key: { ms: 8000, start: 0.11, end: 0.59 },
  kick: { ms: 5000, start: 0.08, end: 0.72 },
  fieldgoal: { ms: 4400, start: 0.12, end: 0.66 },
  pat: { ms: 2600, start: 0.1, end: 0.62 },
  twopoint: { ms: 4600, start: 0.13, end: 0.66 },
  penalty: { ms: 2800, start: 0.15, end: 0.4 },
  play: { ms: 5200, start: 0.13, end: 0.71 },
};

function timing(e: PlayEvent) {
  if (e.key) return TIMING.key;
  if (e.type === 'kickoff' || e.type === 'punt') return TIMING.kick;
  if (e.type === 'fieldgoal') return TIMING.fieldgoal;
  if (e.type === 'pat') return TIMING.pat;
  if (e.type === 'twopoint') return TIMING.twopoint;
  if (e.type === 'penalty') return TIMING.penalty;
  return TIMING.play;
}

/**
 * Anzeigedauer eines Ereignisses. Im Highlight-Modus werden Szenen ohne Highlight-Grund übersprungen
 * (0 = sofort), Highlights laufen in Normaltempo mit der langen Standzeit eines Schlüsselspielzugs.
 */
export function eventDuration(e: PlayEvent, speed: Speed, highlight = false): number {
  if (speed === 'highlights') return highlight ? Math.max(timing(e).ms, TIMING.key.ms) : 0;
  return timing(e).ms / speed;
}

/** Beginn der Bewegung (davor steht die Aufstellung). */
export const motionStart = (e: PlayEvent) => timing(e).start;
/** Ende der Bewegung; danach steht das Bild (Ergebnis/Banner zum Lesen). */
export const motionEnd = (e: PlayEvent) => timing(e).end;

/**
 * Warum ein Ereignis in die Highlights gehört – oder null. Auswahl nach den tatsächlichen Spielereignissen,
 * nicht zufällig: Punkte (TD, FG, Safety), Turnover, verfehlte Field Goals, Raumgewinne ab 20 Yards,
 * geschaffte 4th Downs, 3rd-Down-Conversions bei mindestens 5 Yards oder im letzten Viertel,
 * Sacks auf 3rd/4th Down. PAT/2-Point-Versuche zählen zum Touchdown davor und werden nicht eigens gezeigt.
 */
export function highlightReason(e: PlayEvent): string | null {
  switch (e.outcome) {
    case 'touchdown': return 'Touchdown';
    case 'kickoff_return_td': case 'punt_return_td': return 'Return-Touchdown';
    case 'interception': return e.points ? 'Pick Six' : 'Interception';
    case 'fumble_lost': return 'Fumble verloren';
    case 'safety': return 'Safety';
    case 'fg_good': return 'Field Goal';
    case 'fg_missed': return 'Field Goal verfehlt';
  }
  const scrimmage = e.type === 'pass' || e.type === 'run';
  if (e.turnover && scrimmage) return 'Turnover on Downs';
  if (scrimmage && e.yards >= 20) return `Big Play: +${e.yards} Yards`;
  if (scrimmage && e.firstDown && e.down === 4) return '4th-Down-Conversion';
  if (scrimmage && e.firstDown && e.down === 3 && (e.distance >= 5 || e.quarter >= 4)) return '3rd-Down-Conversion';
  if (e.type === 'sack' && e.down >= 3) return `Sack auf ${e.down === 3 ? '3rd' : '4th'} Down`;
  return null;
}

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
  if (e.firstDown && (e.type === 'pass' || e.type === 'run') && e.down >= 3) return e.down === 3 ? '3RD DOWN CONVERSION' : '4TH DOWN CONVERSION';
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

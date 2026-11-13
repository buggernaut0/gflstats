/**
 * Simulator – Datenformen.
 *
 * SimData: Eingabe aus scripts/export-sim.ts (nur Saison 2026, nur echte Werte aus den Bögen).
 * GameResult/PlayEvent: Ausgabe der Engine. Die Darstellung (2D-Ansicht) liest nur diese Ereignisse
 * und rechnet selbst nichts aus.
 */

export type Stats = Record<string, number>;

export interface SimPlayer {
  id: string;
  name: string;
  /** Nur aus dem offiziellen Kader, sonst null */
  number: number | null;
  /** Rolle laut Website-Daten (QB, RB, WR/TE, DEF, K, P) oder null */
  role: string | null;
  /** Gruppe/Platz in der Starting-Lineup-Logik der Website, null = kein Starter */
  lineupGroup: string | null;
  lineupSpot: string | null;
  games: number;
  stats: Stats;
  /** Werte aus den Spielen gegen einen bestimmten Gegner (Team-ID) – Teamebene, keine Deckungszuordnung */
  vs: Record<string, { games: number; stats: Stats }>;
}

export interface SimTeam {
  id: string;
  name: string;
  abbr: string;
  games: number;
  /** Summe der eigenen Zeilen */
  own: Stats;
  /** Summe der gegnerischen Zeilen in den Spielen dieses Teams */
  opp: Stats;
  /** Werte aus den Spielberichten (3rd/4th Down, First Downs …): Summe + Anzahl Spiele mit Angabe */
  report: Record<string, { sum: number; games: number }>;
  players: SimPlayer[];
}

export interface SimGameRecord {
  id: string;
  date: string;
  type: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

export interface SimData {
  season: number;
  generatedAt: string;
  source: string;
  league: {
    games: number;
    teamGames: number;
    totals: Stats;
    /** Abgeleitet (Regression): Yards pro Sack, negativ */
    sackYards: number;
    /** Abgeleitet (Regression): Raumverlust pro echtem QB-Lauf, negativ */
    qbRunLoss: number;
  };
  teams: SimTeam[];
  games: SimGameRecord[];
}

// ─────────────────────────────────────────────────────────── Ausgabe der Engine

export type PlayType =
  | 'kickoff' | 'pass' | 'run' | 'sack' | 'punt' | 'fieldgoal' | 'pat' | 'twopoint' | 'penalty';

export type Outcome =
  | 'complete' | 'incomplete' | 'drop' | 'breakup' | 'throwaway' | 'interception'
  | 'run' | 'sack' | 'fumble_lost' | 'fumble_kept'
  | 'touchdown' | 'safety'
  | 'punt' | 'punt_touchback' | 'punt_return_td'
  | 'kickoff_return' | 'kickoff_touchback' | 'kickoff_return_td'
  | 'fg_good' | 'fg_missed' | 'pat_good' | 'pat_missed' | 'two_good' | 'two_failed'
  | 'penalty_offense' | 'penalty_defense';

/** Eine Wahrscheinlichkeit, die die Engine für dieses Ereignis berechnet hat (für das „Warum?“-Fenster). */
export interface Chance {
  label: string;
  p: number;
  /** woraus der Wert entstanden ist, z. B. "QB 61 % · Receiver 70 % · Defense 58 %" */
  basis?: string;
}

export interface PlayEvent {
  index: number;
  quarter: number;
  /** verbleibende Sekunden im Viertel vor dem Spielzug */
  clock: number;
  /** Team-ID in Ballbesitz (bei Kickoff/Punt: kickendes Team) */
  offense: string;
  defense: string;
  down: number;
  distance: number;
  /** Ballposition vor dem Spielzug, Yards von der eigenen Goal Line der Offense (0–100) */
  yardLine: number;
  type: PlayType;
  outcome: Outcome;
  /** Raumgewinn aus Sicht der Offense (bei Kicks: Netto-Weite) */
  yards: number;
  /** Ballposition danach aus Sicht der Offense dieses Spielzugs */
  endYardLine: number;
  actors: {
    passer?: string;
    target?: string;
    rusher?: string;
    tackler?: string;
    defender?: string;
    kicker?: string;
    returner?: string;
  };
  /** Wahl der Spielzugart: Anteil Pass in dieser Situation */
  passRate?: number;
  /** Erwarteter Raumgewinn vor dem Zufall (Mittelwert aus den Spieler-/Teamwerten) */
  expectedYards?: number;
  /** Luft-Yards eines Passes (für die Darstellung der Route) */
  airYards?: number;
  /** Kick-Weite (Punt brutto, Kickoff bis zur Annahme) aus Sicht des kickenden Teams */
  kickDistance?: number;
  chances: Chance[];
  /** Punkte, die dieser Spielzug erzeugt hat */
  points?: { team: string; points: number };
  score: Record<string, number>;
  /** kurze deutsche Beschreibung */
  text: string;
  /** Schlüsselspielzug (für die spätere Wiedergabe: voll animieren) */
  key: boolean;
  turnover: boolean;
  firstDown: boolean;
  /** Sekunden, die der Spielzug von der Uhr nimmt */
  elapsed: number;
}

export interface BoxLine {
  team: string;
  name: string;
  pass: number; complete: number; passingyards: number; touchdownpass: number; interception: number;
  run: number; runyards: number; touchdownrun: number;
  targets: number; catched: number; receivingyards: number; touchdowncatch: number;
  tackles: number; sacks: number; intercepted: number; breakups: number; fumbles: number;
  fgTry: number; fgGood: number;
}

export interface GameResult {
  seed: number;
  home: string;
  away: string;
  score: Record<string, number>;
  events: PlayEvent[];
  box: Record<string, BoxLine>;
  team: Record<string, {
    plays: number; passAtt: number; rushAtt: number; passYds: number; rushYds: number; sacks: number;
    turnovers: number; punts: number; fgTry: number; firstDowns: number; longestPass: number; longestRun: number;
  }>;
}

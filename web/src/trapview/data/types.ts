/**
 * Trap View – öffentliche Datenschnittstelle.
 *
 * Alle Inhalte (Teams, Spieler, Nummern, Positionen, Statistiken) kommen aus den GFL-Daten, die
 * scripts/export-data.ts aus den Website-Daten erzeugt (siehe dort). Diese Datei beschreibt nur die
 * Form. Darstellung (Formation, Körperhaltung, Kamera) ist davon getrennt und erfindet keine Daten.
 */

import type { SpotlightPick as ScoredPick } from '../spotlight/scoring';

export type Side = 'offense' | 'defense';

/** Ein vorgestellter Spieler (Player Spotlight) – Auswahl und Gründe aus spotlight/scoring.ts. */
export interface SpotlightPick extends ScoredPick {
  /** Pfad unter public/trapview/ zu einem echten Spielerfoto, sonst null (stilisierte Silhouette) */
  photo: string | null;
}

/** Platz in der dargestellten Formation (reine Darstellung, keine Positionsangabe der Daten). */
export type Position =
  | 'QB' | 'RB' | 'WR' | 'TE' | 'LT' | 'LG' | 'C' | 'RG' | 'RT'
  | 'DE' | 'DT' | 'LB' | 'CB' | 'S';

/** Körperbau – steuert Proportionen des Spielermodells. */
export type Build = 'line' | 'big' | 'skill';

/** Statische Körperhaltung. */
export type Stance = 'shotgun' | 'upright' | 'ready' | 'receiver' | 'lineSet' | 'threePoint';

export interface TeamColors {
  /** Hauptfarbe (dunkles Trikot, Helm). */
  primary: string;
  /** Zweitfarbe (Nummern, Streifen). */
  secondary: string;
  /** Akzent für UI und Details. */
  accent: string;
}

/**
 * Positionsgruppe laut Daten.
 * Mit offiziellem Kader: QB, RB, WR, TE, OL, DL, LB, DB.
 * Ohne Kader (vorläufige Aufstellung): QB, RB, REC (= WR oder TE), OL (immer unbesetzt), DEF (= Verteidiger ohne genauere Position).
 */
export type DataGroup = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'DB' | 'REC' | 'DEF' | 'K' | 'P';

export type Stats = Record<string, number>;

export type MetricKey = 'passing' | 'rushing' | 'receiving' | 'coverage' | 'tackling' | 'passrush';

/** Einordnung innerhalb der eigenen Positionsgruppe der Liga (eine Saison). */
export interface Rank {
  /** Saisonwert der Kennzahl */
  value: number;
  perGame: number;
  /** 1 = höchster Wert pro Spiel */
  rank: number;
  of: number;
  /** Anteil der Vergleichsgruppe mit niedrigerem Wert, 0–100 */
  pct: number;
}

export interface Player {
  /** Spieler-ID der Website */
  id: string;
  name: string;
  /** Nur aus dem offiziellen Kader, sonst null */
  number: number | null;
  /** Spiele mit Eintrag im Statistikbogen (für dieses Team, diese Saison) */
  games: number;
  /** false = nur über die Kulanzregel (Stammkraft) in der Aufstellung */
  volume: boolean | null;
  stats: Stats;
  ranks: Partial<Record<MetricKey, Rank>>;
  /** Werte aus den Spielen gegen einen bestimmten Gegner (Team-ID) */
  vs: Record<string, { games: number; stats: Stats }>;
}

export interface LineupEntry {
  group: DataGroup;
  /** Platz in der schematischen Grundformation der Website: [Gruppe, Index] */
  spot: [string, number];
  /** null = niemand erfüllt die Kriterien, Platz bleibt unbesetzt */
  player: Player | null;
}

export interface Lineup {
  /** "roster" = Positionen/Nummern aus dem offiziellen Kader; "provisional" = nur aus Statistik */
  basis: 'roster' | 'provisional';
  rosterSource: string | null;
  teamGames: number;
  minGames: number;
  flex: { winner: string; loser: string | null; reason: string };
  offense: LineupEntry[];
  defense: LineupEntry[];
}

export interface Team {
  id: string;
  name: string;
  /** Kurzer Stadt-/Ortsname für große Typografie. */
  city: string;
  /** Mannschaftsname ohne Ort. */
  nickname: string;
  abbreviation: string;
  colors: TeamColors;
  /** false = keine belegten Teamfarben, neutrale Platzhalter */
  colorsVerified: boolean;
  colorSource: string | null;
  logo: string | null;
  /** Namen aller Spieler mit Einsatz für das Team in der Saison (zur Unterscheidung gleicher Nachnamen) */
  squad: string[];
  lineup: Lineup;
  /** Bis zu drei herausragende Spieler je Seite (fehlt in älteren Datenständen) */
  spotlight?: { offense: SpotlightPick[]; defense: SpotlightPick[] };
}

export interface SeasonData {
  season: number;
  /** In dieser Saison erfasste Statistikspalten */
  available: string[];
  teams: Team[];
}

export interface DataIndex {
  generatedAt: string;
  source: { note: string; builtAt: string; database: string; databaseSha256: string | null };
  currentSeason: number;
  method: {
    minGameShare: number;
    regularGameShare: number;
    poolMinGames: number;
    slots: Record<string, { basis: string; min: string }>;
    provisionalSlots: Record<string, { basis: string; min: string }>;
    metrics: Record<MetricKey, { label: string; peers: string }>;
  };
  fields: Record<string, { label: string; abbr: string }>;
  seasons: { season: number; teams: number; withRoster: number }[];
}

/** Ein Platz in der Formation. Koordinaten in Yards relativ zur Line of Scrimmage. */
export interface FormationSlot {
  /** Eindeutiger Name des Platzes, z. B. "WR1" */
  role: string;
  position: Position;
  /** Quer zum Feld, 0 = Ball, negativ = links aus Sicht der Offense. */
  x: number;
  /** Längs zum Feld, 0 = Line of Scrimmage, positiv = Richtung Defense. */
  y: number;
  /** Blickrichtung in Grad, 0 = in Angriffsrichtung, 180 = zur Offense. */
  facing: number;
  stance: Stance;
  build: Build;
}

export interface Formation {
  id: string;
  name: string;
  /** Yard-Linie des Balls, gemessen von der eigenen Goal Line der Offense (0–100). */
  ballOn: number;
  offense: FormationSlot[];
  defense: FormationSlot[];
}

/** Vollständige Eingabe für <TrapView />. */
export interface TrapViewData {
  index: DataIndex;
  season: SeasonData;
}

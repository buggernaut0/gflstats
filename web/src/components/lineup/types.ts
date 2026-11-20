import type { TeamKitColors } from "@/lib/teamColors";

export type Unit = "offense" | "defense";

/** Ein Platz der Aufstellung, fertig aufbereitet fuer die Anzeige (alle Werte aus den Daten). */
export interface FieldPlayer {
  slot: string;
  position: string;
  positionLabel: string;
  unit: Unit;
  /** Spieler-ID der Website; null = Platz unbesetzt */
  id: string | null;
  name: string | null;
  /** Rueckennummer laut offiziellem Kader */
  number: number | null;
  games: number;
  stats: { label: string; value: string }[];
  /** Formationsgruppe (QB, RB, WR, TE, OL, DL, LB, DB) – bestimmt Haltung und Koerperbau der Figur */
  spot: string;
  /** Lineman-Platz der Formation (tiefe Haltung) */
  down: boolean;
  /** Schematische Lage in Yards (x quer, z in Spielrichtung) */
  x: number;
  z: number;
}

/** Trikotfarben fuer die Lineup-Szene (aus curation/teams.json, sonst neutral) */
export interface LineupColors {
  primary: string;
  secondary: string;
  kit?: TeamKitColors;
}

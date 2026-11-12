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
  /** Lineman-Platz der Formation (tiefe Haltung) */
  down: boolean;
  /** Schematische Lage in Yards (x quer, z in Spielrichtung) */
  x: number;
  z: number;
}

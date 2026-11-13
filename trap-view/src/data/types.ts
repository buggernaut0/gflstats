/**
 * Trap View – öffentliche Datenschnittstelle.
 *
 * Alles, was die 3D-Szene zeigt, kommt aus diesen Strukturen. Die spätere
 * GFL-Analytics-Integration ersetzt nur die Beispieldaten in `src/data/sample*`
 * durch echte Daten derselben Form.
 */

export type Side = 'offense' | 'defense';

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

export interface Player {
  id: string;
  name: string;
  position: Position;
  number: number;
  build: Build;
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
  offense: Player[];
  defense: Player[];
}

/** Ein Platz in der Formation. Koordinaten in Yards relativ zur Line of Scrimmage. */
export interface FormationSlot {
  /** Verweist auf `Player.number` + `Player.position` über die Rolle. */
  role: string;
  position: Position;
  /** Reihenfolge innerhalb gleicher Positionen (z. B. WR 0,1,2). */
  index: number;
  /** Quer zum Feld, 0 = Ball, negativ = links aus Sicht der Offense. */
  x: number;
  /** Längs zum Feld, 0 = Line of Scrimmage, positiv = Richtung Defense. */
  y: number;
  /** Blickrichtung in Grad, 0 = in Angriffsrichtung, 180 = zur Offense. */
  facing: number;
  stance: Stance;
}

export interface Formation {
  id: string;
  name: string;
  /** Yard-Linie des Balls, gemessen von der eigenen Goal Line der Offense (0–100). */
  ballOn: number;
  offense: FormationSlot[];
  defense: FormationSlot[];
}

export interface ComparisonStat {
  label: string;
  offense: number;
  defense: number;
  /** Anzeigeeinheit, z. B. "s" oder "%". */
  unit?: string;
  /** true, wenn ein kleinerer Wert besser ist (z. B. 40-Yard-Zeit). */
  lowerIsBetter?: boolean;
}

export interface Matchup {
  id: string;
  /** Rollen aus der Formation, z. B. "WR1" gegen "CB1". */
  offenseRole: string;
  defenseRole: string;
  stats: ComparisonStat[];
}

/** Vollständige Eingabe für <TrapView />. */
export interface TrapViewData {
  /** Muss true sein, solange keine echten GFL-Daten übergeben werden. */
  isSampleData: boolean;
  teams: Team[];
  formation: Formation;
  matchups: Matchup[];
}

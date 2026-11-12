/** Datentypen der von scripts/build_data.py erzeugten Dateien in public/data/. */

export type Stats = Record<string, number>;
export type Scope = "all" | "regular" | "playoff";
export type Role = "QB" | "RB" | "WR/TE" | "DEF" | "K" | "P" | null;

export interface Meta {
  builtAt: string;
  source: { database: string; databaseSha256: string; gamelist: string; gamelistSha256: string; origin: string };
  seasons: number[];
  currentSeason: number;
  availability: Record<string, number[]>;
  availabilityRule: string;
  counts: { games: number; playerGameRows: number; players: number; teams: number };
  corrections: { type: string; id: string; detail: string; reason: string; name?: string; variants?: string[] }[];
  warnings: string[];
  checks: { total: number; failed: unknown[] };
}

export interface Team {
  id: string;
  name: string;
  short: string;
  abbr: string;
  namesBySeason: Record<string, string>;
  colors: { primary: string; secondary?: string } | null;
  /** Pfad unter public/ (z. B. logos/kiel-baltic-hurricanes.png); null = kein offizielles Logo hinterlegt. */
  logo: string | null;
  logoSource?: string | null;
  logoPage?: string | null;
  sources: string[];
  note: string | null;
}

export interface PlayerSeasonInfo {
  season: number;
  teams: string[];
  games: number;
  role: Role;
  source: "abgeleitet" | "manuell";
}

export interface Player {
  id: string;
  name: string;
  sourceNames: string[];
  shared: boolean;
  seasons: PlayerSeasonInfo[];
  videos: { player: string; platform: string; url: string; title?: string }[];
}

export interface TeamGameStats {
  points?: number;
  rushAtt?: number;
  rushYds?: number;
  passAtt?: number;
  passCmp?: number;
  passYds?: number;
  thirdAtt?: number;
  thirdConv?: number;
  fourthAtt?: number;
  fourthConv?: number;
  redzone?: number;
  redzoneTd?: number;
  firstDowns?: number;
  penalties?: number;
  penaltyYds?: number;
  timeOfPossession?: string;
  totalYds?: number;
}

export interface Game {
  id: string;
  season: number;
  type: "regular" | "playoff";
  date: string;
  name: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  teamStats: Record<string, TeamGameStats>;
  statsSource: "presto" | "statsnscore";
  /** Geprueft zugeordnetes Highlight-Video (curation/game_videos.json) */
  video?: GameVideo;
}

export interface GameVideo {
  youtubeId: string;
  title: string;
  channel: string | null;
  published: string | null;
}

export interface PlayerSeason {
  player: string;
  season: number;
  scope: Scope;
  games: number;
  teams: string[];
  stats: Stats;
}

export interface TeamSeason {
  team: string;
  season: number;
  scope: Scope;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  offense: Stats;
  defenseAllowed: Stats;
}

/** Eine Zeile "Spieler in einem Spiel": g = Spiel, p = Spieler, t = Team, s = Werte */
export interface PlayerGame {
  g: string;
  p: string;
  t: string;
  s: Stats;
}

export interface FieldDef {
  key: string;
  label: string;
  abbr: string;
  group: string;
  agg: "sum" | "max";
  description: string;
}

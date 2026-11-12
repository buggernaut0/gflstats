/**
 * Kennzahlen-Katalog: Originalwerte (aus den Spielboegen) und abgeleitete Kennzahlen
 * (mit Formel). Wird von allen Ranglisten, Suchen und Vergleichen benutzt - eine Stelle,
 * eine Definition. Rein und ohne Seiteneffekte, laeuft beim Build und im Browser.
 */
import fieldsJson from "../config/fields.json" with { type: "json" };
import type { FieldDef, Role, Stats } from "./types";

export const FIELD_DEFS: FieldDef[] = (fieldsJson as { fields: FieldDef[] }).fields;

export type Group = "passing" | "rushing" | "receiving" | "defense" | "kicking" | "returns" | "scoring" | "derived";

export const GROUP_LABELS: Record<string, string> = {
  passing: "Passing",
  rushing: "Rushing",
  receiving: "Receiving",
  defense: "Defense",
  kicking: "Kicking",
  returns: "Returns",
  scoring: "Punkte und Strafen",
};

export interface StatDef {
  key: string;
  label: string;
  abbr: string;
  group: string;
  kind: "original" | "derived";
  /** Nachkommastellen in der Anzeige */
  decimals: number;
  lowerIsBetter?: boolean;
  /** Formel in Worten, fuer Tooltips und die Methodik-Seite */
  formula?: string;
  /** Originalfelder, die erfasst sein muessen */
  needs: string[];
  /** Berechnung aus Saison- oder Spielwerten; null = nicht berechenbar */
  compute: (s: Stats, games: number) => number | null;
  /** Mindestvolumen fuer Ranglisten von Quoten (Saisonebene) */
  qualifier?: { field: string; min: number; label: string };
  /** "pro Spiel"-Kennzahl: auf Spielebene nicht sinnvoll */
  perGame?: boolean;
  unit?: string;
}

const v = (s: Stats, k: string) => s[k] ?? 0;
const ratio = (a: number, b: number, f = 1) => (b > 0 ? (a / b) * f : null);

const original: StatDef[] = FIELD_DEFS.map((f) => ({
  key: f.key,
  label: f.label,
  abbr: f.abbr,
  group: f.group,
  kind: "original" as const,
  decimals: 0,
  lowerIsBetter: ["interception", "fumbled", "fumbledandlost", "penalty", "penaltyyards", "droppedpass", "passwasdropped", "fieldgoalmissed", "patkickmissed"].includes(f.key),
  formula: f.agg === "max" ? "Höchstwert" : undefined,
  needs: [f.key],
  compute: (s: Stats) => s[f.key] ?? 0,
}));

const derivedDefs: Omit<StatDef, "kind">[] = [
  { key: "cmpPct", label: "Completion-Quote", abbr: "Cmp%", group: "passing", decimals: 1, unit: "%", formula: "Completions / Passversuche × 100", needs: ["complete", "pass"], compute: (s) => ratio(v(s, "complete"), v(s, "pass"), 100), qualifier: { field: "pass", min: 75, label: "mind. 75 Passversuche" } },
  { key: "ypa", label: "Yards pro Passversuch", abbr: "Y/A", group: "passing", decimals: 1, formula: "Passing Yards / Passversuche", needs: ["passingyards", "pass"], compute: (s) => ratio(v(s, "passingyards"), v(s, "pass")), qualifier: { field: "pass", min: 75, label: "mind. 75 Passversuche" } },
  { key: "intPct", label: "Interception-Quote", abbr: "INT%", group: "passing", decimals: 1, unit: "%", lowerIsBetter: true, formula: "Interceptions / Passversuche × 100", needs: ["interception", "pass"], compute: (s) => ratio(v(s, "interception"), v(s, "pass"), 100), qualifier: { field: "pass", min: 75, label: "mind. 75 Passversuche" } },
  { key: "tdPct", label: "Touchdown-Quote (Pass)", abbr: "TD%", group: "passing", decimals: 1, unit: "%", formula: "Passing TD / Passversuche × 100", needs: ["touchdownpass", "pass"], compute: (s) => ratio(v(s, "touchdownpass"), v(s, "pass"), 100), qualifier: { field: "pass", min: 75, label: "mind. 75 Passversuche" } },
  { key: "passYdsPg", label: "Passing Yards pro Spiel", abbr: "PaY/G", group: "passing", decimals: 1, perGame: true, formula: "Passing Yards / Spiele", needs: ["passingyards"], compute: (s, g) => ratio(v(s, "passingyards"), g), qualifier: { field: "pass", min: 75, label: "mind. 75 Passversuche" } },
  { key: "passTdPg", label: "Passing TD pro Spiel", abbr: "PaTD/G", group: "passing", decimals: 2, perGame: true, formula: "Passing TD / Spiele", needs: ["touchdownpass"], compute: (s, g) => ratio(v(s, "touchdownpass"), g), qualifier: { field: "pass", min: 75, label: "mind. 75 Passversuche" } },
  { key: "ypc", label: "Yards pro Carry", abbr: "Y/C", group: "rushing", decimals: 1, formula: "Rushing Yards / Carries", needs: ["runyards", "run"], compute: (s) => ratio(v(s, "runyards"), v(s, "run")), qualifier: { field: "run", min: 40, label: "mind. 40 Carries" } },
  { key: "rushYdsPg", label: "Rushing Yards pro Spiel", abbr: "RuY/G", group: "rushing", decimals: 1, perGame: true, formula: "Rushing Yards / Spiele", needs: ["runyards"], compute: (s, g) => ratio(v(s, "runyards"), g), qualifier: { field: "run", min: 40, label: "mind. 40 Carries" } },
  { key: "rushTdPg", label: "Rushing TD pro Spiel", abbr: "RuTD/G", group: "rushing", decimals: 2, perGame: true, formula: "Rushing TD / Spiele", needs: ["touchdownrun"], compute: (s, g) => ratio(v(s, "touchdownrun"), g), qualifier: { field: "run", min: 40, label: "mind. 40 Carries" } },
  { key: "fumbleRate", label: "Fumble-Quote", abbr: "Fum%", group: "rushing", decimals: 1, unit: "%", lowerIsBetter: true, formula: "Fumbles / (Carries + Receptions) × 100", needs: ["fumbled", "run", "catched"], compute: (s) => ratio(v(s, "fumbled"), v(s, "run") + v(s, "catched"), 100), qualifier: { field: "run", min: 40, label: "mind. 40 Carries" } },
  { key: "ypr", label: "Yards pro Reception", abbr: "Y/R", group: "receiving", decimals: 1, formula: "Receiving Yards / Receptions", needs: ["receivingyards", "catched"], compute: (s) => ratio(v(s, "receivingyards"), v(s, "catched")), qualifier: { field: "catched", min: 15, label: "mind. 15 Receptions" } },
  { key: "recYdsPg", label: "Receiving Yards pro Spiel", abbr: "ReY/G", group: "receiving", decimals: 1, perGame: true, formula: "Receiving Yards / Spiele", needs: ["receivingyards"], compute: (s, g) => ratio(v(s, "receivingyards"), g), qualifier: { field: "catched", min: 15, label: "mind. 15 Receptions" } },
  { key: "recPg", label: "Receptions pro Spiel", abbr: "Rec/G", group: "receiving", decimals: 1, perGame: true, formula: "Receptions / Spiele", needs: ["catched"], compute: (s, g) => ratio(v(s, "catched"), g), qualifier: { field: "catched", min: 15, label: "mind. 15 Receptions" } },
  { key: "recTdPg", label: "Receiving TD pro Spiel", abbr: "ReTD/G", group: "receiving", decimals: 2, perGame: true, formula: "Receiving TD / Spiele", needs: ["touchdowncatch"], compute: (s, g) => ratio(v(s, "touchdowncatch"), g), qualifier: { field: "catched", min: 15, label: "mind. 15 Receptions" } },
  { key: "tdPerRec", label: "Touchdown-Quote (Receiving)", abbr: "TD/Rec%", group: "receiving", decimals: 1, unit: "%", formula: "Receiving TD / Receptions × 100", needs: ["touchdowncatch", "catched"], compute: (s) => ratio(v(s, "touchdowncatch"), v(s, "catched"), 100), qualifier: { field: "catched", min: 15, label: "mind. 15 Receptions" } },
  { key: "scrimYds", label: "Scrimmage Yards", abbr: "Scrim", group: "rushing", decimals: 0, formula: "Rushing Yards + Receiving Yards", needs: ["runyards", "receivingyards"], compute: (s) => v(s, "runyards") + v(s, "receivingyards") },
  { key: "scrimYdsPg", label: "Scrimmage Yards pro Spiel", abbr: "Scr/G", group: "rushing", decimals: 1, perGame: true, formula: "(Rushing + Receiving Yards) / Spiele", needs: ["runyards", "receivingyards"], compute: (s, g) => ratio(v(s, "runyards") + v(s, "receivingyards"), g) },
  { key: "tklPg", label: "Tackles pro Spiel", abbr: "Tkl/G", group: "defense", decimals: 1, perGame: true, formula: "Tackles / Spiele", needs: ["tackletotal"], compute: (s, g) => ratio(v(s, "tackletotal"), g) },
  { key: "tflPg", label: "Tackles for Loss pro Spiel", abbr: "TFL/G", group: "defense", decimals: 2, perGame: true, formula: "TFL / Spiele", needs: ["tackleforloss"], compute: (s, g) => ratio(v(s, "tackleforloss"), g) },
  { key: "sackPg", label: "Sacks pro Spiel", abbr: "Sck/G", group: "defense", decimals: 2, perGame: true, formula: "Sacks / Spiele", needs: ["sacktotal"], compute: (s, g) => ratio(v(s, "sacktotal"), g) },
  { key: "intPg", label: "Interceptions pro Spiel", abbr: "INT/G", group: "defense", decimals: 2, perGame: true, formula: "Interceptions / Spiele", needs: ["intercepted"], compute: (s, g) => ratio(v(s, "intercepted"), g) },
  { key: "pdPg", label: "Pässe abgewehrt pro Spiel", abbr: "PD/G", group: "defense", decimals: 2, perGame: true, formula: "Abgewehrte Pässe / Spiele", needs: ["brokenuppass"], compute: (s, g) => ratio(v(s, "brokenuppass"), g) },
  { key: "ffPg", label: "Forced Fumbles pro Spiel", abbr: "FF/G", group: "defense", decimals: 2, perGame: true, formula: "Forced Fumbles / Spiele", needs: ["forcedfumble"], compute: (s, g) => ratio(v(s, "forcedfumble"), g) },
  { key: "fgPct", label: "Field-Goal-Quote", abbr: "FG%", group: "kicking", decimals: 1, unit: "%", formula: "Field Goals gut / Versuche × 100", needs: ["fieldgoalgood", "fieldgoaltry"], compute: (s) => ratio(v(s, "fieldgoalgood"), v(s, "fieldgoaltry"), 100), qualifier: { field: "fieldgoaltry", min: 5, label: "mind. 5 Versuche" } },
  { key: "xpPct", label: "PAT-Quote", abbr: "XP%", group: "kicking", decimals: 1, unit: "%", formula: "PAT gut / PAT-Versuche × 100", needs: ["patkickgood", "patkick"], compute: (s) => ratio(v(s, "patkickgood"), v(s, "patkick"), 100), qualifier: { field: "patkick", min: 10, label: "mind. 10 PAT-Versuche" } },
  { key: "puntAvg", label: "Yards pro Punt", abbr: "P Avg", group: "kicking", decimals: 1, formula: "Punt-Yards / Punts", needs: ["puntyards", "punt"], compute: (s) => ratio(v(s, "puntyards"), v(s, "punt")), qualifier: { field: "punt", min: 10, label: "mind. 10 Punts" } },
  { key: "krAvg", label: "Yards pro Kickoff-Return", abbr: "KR Avg", group: "returns", decimals: 1, formula: "Kickoff-Return-Yards / Kickoff-Returns", needs: ["kickoffreturnyards", "kickoffreturn"], compute: (s) => ratio(v(s, "kickoffreturnyards"), v(s, "kickoffreturn")), qualifier: { field: "kickoffreturn", min: 8, label: "mind. 8 Returns" } },
  { key: "prAvg", label: "Yards pro Punt-Return", abbr: "PR Avg", group: "returns", decimals: 1, formula: "Punt-Return-Yards / Punt-Returns", needs: ["puntreturnyards", "puntreturn"], compute: (s) => ratio(v(s, "puntreturnyards"), v(s, "puntreturn")), qualifier: { field: "puntreturn", min: 6, label: "mind. 6 Returns" } },
  { key: "tdPg", label: "Touchdowns pro Spiel", abbr: "TD/G", group: "scoring", decimals: 2, perGame: true, formula: "Touchdowns / Spiele", needs: ["touchdown"], compute: (s, g) => ratio(v(s, "touchdown"), g) },
  { key: "ptsPg", label: "Punkte pro Spiel", abbr: "Pkt/G", group: "scoring", decimals: 1, perGame: true, formula: "Punkte / Spiele", needs: ["points"], compute: (s, g) => ratio(v(s, "points"), g) },
];
const derived: StatDef[] = derivedDefs.map((d) => ({ ...d, kind: "derived" as const }));

export const STATS: StatDef[] = [...original, ...derived];
export const STAT = new Map(STATS.map((s) => [s.key, s]));

export function stat(key: string): StatDef {
  const s = STAT.get(key);
  if (!s) throw new Error(`Unbekannte Kennzahl: ${key}`);
  return s;
}

/** Ist eine Kennzahl in einer Saison berechenbar? (alle benoetigten Felder erfasst) */
export function statAvailable(def: StatDef, season: number, availability: Record<string, number[]>): boolean {
  return def.needs.every((f) => availability[f]?.includes(season));
}

/** Wertet eine Kennzahl aus; "Tackles"/"Sacks" behalten halbe Werte. */
export function value(def: StatDef, s: Stats, games: number): number | null {
  const x = def.compute(s, games);
  return x === null || !Number.isFinite(x) ? null : x;
}

export function qualifies(def: StatDef, s: Stats): boolean {
  return !def.qualifier || (s[def.qualifier.field] ?? 0) >= def.qualifier.min;
}

export function formatStat(def: StatDef, x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "–";
  const decimals = def.kind === "original" && !Number.isInteger(x) ? 1 : def.decimals;
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(x) + (def.unit === "%" ? " %" : "");
}

// ---------------------------------------------------------------- Rollen

export const ROLE_LABELS: Record<string, string> = {
  QB: "Quarterback",
  RB: "Running Back",
  "WR/TE": "Receiver (WR/TE)",
  DEF: "Defense",
  K: "Kicker",
  P: "Punter",
};

/** Sechs Radar-Achsen je Rolle (Hexagon). */
export const ROLE_AXES: Record<string, string[]> = {
  QB: ["passYdsPg", "passTdPg", "cmpPct", "ypa", "intPct", "rushYdsPg"],
  RB: ["rushYdsPg", "ypc", "rushTdPg", "recYdsPg", "longestrun", "fumbleRate"],
  "WR/TE": ["recYdsPg", "recPg", "recTdPg", "ypr", "longestcatch", "tdPerRec"],
  DEF: ["tklPg", "tflPg", "sackPg", "intPg", "pdPg", "ffPg"],
  K: ["fieldgoalgood", "longestfieldgoal", "xpPct", "patkickgood", "ptsPg", "kickingyards"],
  P: ["puntAvg", "longestpunt", "punt", "puntinside20", "puntyards", "punttouchback"],
};

/** Mindestvolumen, um in die Vergleichsgruppe einer Rolle zu kommen. */
export const ROLE_MIN: Record<string, { field: string; min: number; label: string }> = {
  QB: { field: "pass", min: 75, label: "mind. 75 Passversuche" },
  RB: { field: "run", min: 40, label: "mind. 40 Carries" },
  "WR/TE": { field: "catched", min: 15, label: "mind. 15 Receptions" },
  DEF: { field: "tackletotal", min: 15, label: "mind. 15 Tackles" },
  K: { field: "patkickgood", min: 10, label: "mind. 10 erfolgreiche PATs" },
  P: { field: "punt", min: 15, label: "mind. 15 Punts" },
};
export const MIN_GAMES = 4;

/** Kennzahlen, die das Profil je Rolle zuerst zeigt. */
export const ROLE_HEADLINE: Record<string, string[]> = {
  QB: ["passingyards", "touchdownpass", "interception", "cmpPct", "ypa"],
  RB: ["runyards", "touchdownrun", "ypc", "scrimYds", "rushYdsPg"],
  "WR/TE": ["receivingyards", "catched", "touchdowncatch", "ypr", "recYdsPg"],
  DEF: ["tackletotal", "tackleforloss", "sacktotal", "intercepted", "brokenuppass"],
  K: ["fieldgoalgood", "longestfieldgoal", "patkickgood", "points"],
  P: ["punt", "puntAvg", "longestpunt", "puntinside20"],
};

// ---------------------------------------------------------------- Perzentile

/**
 * Perzentil eines Werts in einer Vergleichsgruppe nach der Mittelrang-Methode:
 * (Anzahl schlechterer Werte + halbe Anzahl gleicher Werte) / Gruppengroesse × 100.
 * Bei "weniger ist besser" wird umgedreht. 90 heisst: besser als 90 % der Gruppe.
 */
export function percentile(x: number, group: number[], lowerIsBetter = false): number {
  if (!group.length) return 0;
  let below = 0;
  let equal = 0;
  for (const g of group) {
    if (g === x) equal++;
    else if (lowerIsBetter ? g > x : g < x) below++;
  }
  return ((below + equal / 2) / group.length) * 100;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type { Role };

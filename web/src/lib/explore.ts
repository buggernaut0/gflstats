/** Gemeinsame Zeilen-Logik fuer Leaders und Player Search (laeuft im Browser). */
import { FIELD_DEFS, GROUP_LABELS, STATS, stat, statAvailable, value, type StatDef } from "./stats.ts";
import type { Condition, Logic } from "./query";
import type { Player, PlayerSeason, Scope, Stats } from "./types";

export interface PRow {
  key: string;
  player: string;
  name: string;
  /** Saison oder 0 = Karriere */
  season: number;
  seasons: number[];
  teams: string[];
  role: string | null;
  games: number;
  stats: Stats;
}

const MAX = new Set(FIELD_DEFS.filter((f) => f.agg === "max").map((f) => f.key));

export function seasonRows(ps: PlayerSeason[], players: Map<string, Player>, scope: Scope): PRow[] {
  return ps
    .filter((s) => s.scope === scope && !players.get(s.player)?.shared)
    .map((s) => {
      const p = players.get(s.player)!;
      return {
        key: `${s.player}|${s.season}`,
        player: s.player,
        name: p.name,
        season: s.season,
        seasons: [s.season],
        teams: s.teams,
        role: p.seasons.find((x) => x.season === s.season)?.role ?? null,
        games: s.games,
        stats: s.stats,
      };
    });
}

/** Karriere = Summe aller Saisons ("Laengster ..." als Maximum). */
export function careerRows(ps: PlayerSeason[], players: Map<string, Player>, scope: Scope): PRow[] {
  const m = new Map<string, PRow>();
  for (const r of seasonRows(ps, players, scope)) {
    const e = m.get(r.player) ?? { ...r, key: r.player, season: 0, seasons: [], teams: [], stats: {}, games: 0 };
    e.games += r.games;
    e.seasons.push(r.season);
    for (const t of r.teams) if (!e.teams.includes(t)) e.teams.push(t);
    for (const [k, v] of Object.entries(r.stats)) e.stats[k] = MAX.has(k) ? Math.max(e.stats[k] ?? 0, v) : Math.round(((e.stats[k] ?? 0) + v) * 100) / 100;
    e.role = r.role ?? e.role;
    m.set(r.player, e);
  }
  return [...m.values()];
}

/**
 * Wert einer Kennzahl fuer eine Zeile. perGame teilt Originalwerte durch die Spiele.
 * null, wenn die Kennzahl in keiner der Saisons der Zeile erfasst ist.
 */
export function rowValue(def: StatDef, row: PRow, availability: Record<string, number[]>, perGame = false): number | null {
  if (!rowRecorded(def, row, availability)) return null;
  const x = value(def, row.stats, row.games);
  if (x === null) return null;
  return perGame && def.kind === "original" && !def.key.startsWith("longest") ? x / Math.max(1, row.games) : x;
}

/** Ist die Kennzahl in mindestens einer Saison der Zeile erfasst? Sonst zeigt die Oberflaeche "n. e.". */
export function rowRecorded(def: StatDef, row: PRow, availability: Record<string, number[]>): boolean {
  return row.seasons.some((s) => statAvailable(def, s, availability));
}

export const STAT_OPTIONS = STATS.map((s) => ({
  key: s.key,
  label: `${s.label} (${s.abbr})${s.kind === "derived" ? " *" : ""}`,
  group: GROUP_LABELS[s.group] ?? "Weitere",
}));

/** Kennzahlen, die auf Spielebene sinnvoll sind (keine "pro Spiel"-Werte). */
export const GAME_STAT_OPTIONS = STAT_OPTIONS.filter((o) => !stat(o.key).perGame);

export const ROLES = ["QB", "RB", "WR/TE", "DEF", "K", "P"];

/** Suchvorlagen der Statistiksuche (setzen Bedingungen, Saison und Rolle). */
export const PLAYER_PRESETS: { label: string; season: string; role: string; logic?: Logic; conds: Condition[] }[] = [
  { label: "Receiver 2025: ≥ 500 Rec Yds, ≥ 5 TD, > 50 Rec", season: "2025", role: "WR/TE", conds: [{ stat: "receivingyards", op: "gte", a: 500 }, { stat: "touchdowncatch", op: "gte", a: 5 }, { stat: "catched", op: "gt", a: 50 }] },
  { label: "Running Backs: ≥ 5,0 Yards pro Carry", season: "", role: "RB", conds: [{ stat: "ypc", op: "gte", a: 5 }, { stat: "run", op: "gte", a: 60 }] },
  { label: "Quarterbacks: ≥ 30 Pass-TD, ≤ 10 INT", season: "", role: "QB", conds: [{ stat: "touchdownpass", op: "gte", a: 30 }, { stat: "interception", op: "lte", a: 10 }] },
  { label: "Pass Rusher: ≥ 8 Sacks oder ≥ 15 TFL", season: "", role: "", logic: "or", conds: [{ stat: "sacktotal", op: "gte", a: 8 }, { stat: "tackleforloss", op: "gte", a: 15 }] },
];

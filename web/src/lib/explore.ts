/** Gemeinsame Zeilen-Logik fuer Leaders und Player Search (laeuft im Browser). */
import { GROUP_LABELS, STATS, addStats, stat, statAvailable, value, type StatDef } from "./stats.ts";
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
    addStats(e.stats, r.stats);
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

/**
 * Karrierewerte als eigene Kennzahlen der Statistiksuche ("Karriere: Rushing Yards").
 * Schluessel mit Praefix "k.", z. B. "k.runyards" = Summe aller Saisons (careerRows), "Laengster ..." als Maximum.
 */
export const CAREER_PREFIX = "k.";
export const isCareerKey = (k: string) => k.startsWith(CAREER_PREFIX);
export const baseKey = (k: string) => (isCareerKey(k) ? k.slice(CAREER_PREFIX.length) : k);

export const CAREER_STAT_OPTIONS = STATS.map((s) => ({
  key: CAREER_PREFIX + s.key,
  label: `Karriere: ${s.label} (${s.abbr})${s.kind === "derived" ? " *" : ""}`,
  group: `Karriere · ${GROUP_LABELS[s.group] ?? "Weitere"}`,
}));

/** Auswahl der Spielersuche: jede Kennzahl als Saisonwert und als Karrierewert. */
export const PLAYER_STAT_OPTIONS = [...STAT_OPTIONS, ...CAREER_STAT_OPTIONS];

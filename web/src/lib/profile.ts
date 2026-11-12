/**
 * Perzentil-Profile je Rolle: Grundlage fuer Radar-Charts, Rollen-Index und Breakouts.
 * Vergleichsgruppe = alle Spieler derselben (abgeleiteten) Rolle in derselben Saison mit
 * mindestens MIN_GAMES Spielen und dem Mindestvolumen der Rolle (ROLE_MIN).
 */
import { MIN_GAMES, ROLE_AXES, ROLE_MIN, median, percentile, stat, statAvailable, value } from "./stats";
import type { Player, PlayerSeason } from "./types";

export interface Entry {
  player: string;
  season: number;
  games: number;
  teams: string[];
  stats: Record<string, number>;
  role: string | null;
}

/** Saisonwerte (Regular Season + Playoffs) je Spieler, verbunden mit der abgeleiteten Rolle. */
export function entries(seasons: PlayerSeason[], players: Player[]): Entry[] {
  const roles = new Map<string, string | null>();
  for (const p of players) for (const s of p.seasons) roles.set(`${p.id}|${s.season}`, s.role);
  const shared = new Set(players.filter((p) => p.shared).map((p) => p.id));
  return seasons
    .filter((s) => s.scope === "all" && !shared.has(s.player))
    .map((s) => ({ player: s.player, season: s.season, games: s.games, teams: s.teams, stats: s.stats, role: roles.get(`${s.player}|${s.season}`) ?? null }));
}

export function qualified(e: Entry, role: string): boolean {
  const m = ROLE_MIN[role];
  return e.games >= MIN_GAMES && (e.stats[m.field] ?? 0) >= m.min;
}

/** Vergleichsgruppe: gleiche Rolle; Saison = eine Saison oder "all" fuer alle Saisons. */
export function comparisonGroup(all: Entry[], role: string, season: number | "all"): Entry[] {
  return all.filter((e) => e.role === role && (season === "all" || e.season === season) && qualified(e, role));
}

export interface Axis {
  key: string;
  label: string;
  abbr: string;
  value: number | null;
  pct: number | null;
  median: number | null;
  medianPct: number;
  lowerIsBetter: boolean;
  available: boolean;
  groupSize: number;
}

export function axesFor(e: Entry, role: string, group: Entry[], availability: Record<string, number[]>): Axis[] {
  return (ROLE_AXES[role] ?? []).map((key) => {
    const def = stat(key);
    const avail = statAvailable(def, e.season, availability);
    const peers = group.filter((g) => statAvailable(def, g.season, availability));
    const vals = peers.map((g) => value(def, g.stats, g.games)).filter((x): x is number => x !== null);
    const x = avail ? value(def, e.stats, e.games) : null;
    const med = median(vals);
    return {
      key,
      label: def.label,
      abbr: def.abbr,
      value: x,
      pct: x === null || !vals.length ? null : percentile(x, vals, def.lowerIsBetter),
      median: med,
      medianPct: 50,
      lowerIsBetter: !!def.lowerIsBetter,
      available: avail,
      groupSize: vals.length,
    };
  });
}

/**
 * Rollen-Index (Modell): Mittelwert der verfuegbaren Achsen-Perzentile.
 * Nur fuer Spieler in der Vergleichsgruppe. Keine Auszeichnung, sondern eine Zusammenfassung.
 */
export function roleIndex(axes: Axis[]): number | null {
  const ps = axes.map((a) => a.pct).filter((x): x is number => x !== null);
  return ps.length >= 4 ? ps.reduce((a, b) => a + b, 0) / ps.length : null;
}

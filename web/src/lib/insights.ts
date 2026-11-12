/**
 * Abgeleitete Auswertungen (Modelle), alle offen gelegt auf der Methodik-Seite:
 * - Rollen-Index: Mittelwert der Perzentile auf den sechs Radar-Achsen einer Rolle
 * - Breakouts: groesster Anstieg des Rollen-Index gegenueber der Vorsaison
 * - Rekorde: beste Einzelspiele, Saisons und Karrierewerte seit 2023
 */
import { axesFor, comparisonGroup, qualified, roleIndex, type Axis, type Entry } from "./profile";
import { ROLE_AXES, ROLE_MIN, MIN_GAMES, formatStat, stat, statAvailable, value } from "./stats";
import type { Game, Player, PlayerGame } from "./types";

export const BREAKOUT_RULES = {
  minDelta: 20,
  minIndex: 60,
  minAxes: 4,
};

export interface IndexRow {
  player: string;
  season: number;
  role: string;
  games: number;
  teams: string[];
  index: number;
  axes: Axis[];
}

/** Rollen-Index aller Spieler einer Saison in ihrer Vergleichsgruppe. */
export function roleIndexRows(all: Entry[], season: number, availability: Record<string, number[]>): IndexRow[] {
  const out: IndexRow[] = [];
  for (const role of Object.keys(ROLE_AXES)) {
    const group = comparisonGroup(all, role, season);
    for (const e of group) {
      const axes = axesFor(e, role, group, availability);
      const idx = roleIndex(axes);
      if (idx !== null) out.push({ player: e.player, season, role, games: e.games, teams: e.teams, index: idx, axes });
    }
  }
  return out.sort((a, b) => b.index - a.index);
}

export interface Breakout {
  player: string;
  role: string;
  season: number;
  teams: string[];
  prevTeams: string[];
  before: number;
  after: number;
  games: number;
  prevGames: number;
  /** wichtigste Kennzahl der Rolle vorher/nachher, fertig formatiert */
  keyStat: { label: string; before: string; after: string };
}

/**
 * Breakout = Rollen-Index steigt gegenueber der Vorsaison um mindestens BREAKOUT_RULES.minDelta Punkte
 * auf mindestens BREAKOUT_RULES.minIndex. Bedingungen: gleiche Rolle in beiden Saisons, in beiden
 * Saisons mindestens MIN_GAMES Spiele, in der neuen Saison das Mindestvolumen der Rolle. Verglichen
 * werden nur Achsen, die in beiden Saisons erfasst sind; alle Werte sind pro Spiel oder Quoten,
 * damit unterschiedliche Spielzahlen nicht verzerren.
 */
export function breakouts(all: Entry[], season: number, availability: Record<string, number[]>): Breakout[] {
  const prev = season - 1;
  const out: Breakout[] = [];
  for (const role of Object.keys(ROLE_AXES)) {
    const now = comparisonGroup(all, role, season);
    const before = all.filter((e) => e.season === prev && e.role === role);
    const groupPrev = comparisonGroup(all, role, prev);
    for (const e of now) {
      const p = before.find((x) => x.player === e.player);
      if (!p || p.games < MIN_GAMES) continue;
      const shared = ROLE_AXES[role].filter((k) => statAvailable(stat(k), season, availability) && statAvailable(stat(k), prev, availability));
      if (shared.length < BREAKOUT_RULES.minAxes) continue;
      const idx = (x: Entry, group: Entry[]) => {
        const axes = axesFor(x, role, group, availability).filter((a) => shared.includes(a.key));
        const ps = axes.map((a) => a.pct).filter((v): v is number => v !== null);
        return ps.length ? ps.reduce((s, v) => s + v, 0) / ps.length : null;
      };
      const a = idx(e, now);
      const b = idx(p, groupPrev);
      if (a === null || b === null) continue;
      if (a - b >= BREAKOUT_RULES.minDelta && a >= BREAKOUT_RULES.minIndex) {
        const k = ROLE_AXES[role][0];
        const d = stat(k);
        out.push({
          player: e.player, role, season, teams: e.teams, prevTeams: p.teams, before: b, after: a, games: e.games, prevGames: p.games,
          keyStat: { label: d.label, before: formatStat(d, value(d, p.stats, p.games)), after: formatStat(d, value(d, e.stats, e.games)) },
        });
      }
    }
  }
  return out.sort((x, y) => y.after - y.before - (x.after - x.before));
}

export { qualified, ROLE_MIN };

// ---------------------------------------------------------------- Rekorde

export const RECORD_FIELDS = ["passingyards", "touchdownpass", "runyards", "touchdownrun", "receivingyards", "catched", "touchdowncatch", "tackletotal", "sacktotal", "intercepted", "longestpass", "longestrun", "longestcatch", "longestfieldgoal"];

export interface GameRecord {
  player: string;
  team: string;
  opponent: string;
  game: string;
  date: string;
  season: number;
  value: number;
}

export function gameRecords(rows: PlayerGame[], games: Map<string, Game>, players: Map<string, Player>, field: string, limit = 10): GameRecord[] {
  return rows
    .filter((r) => (r.s[field] ?? 0) > 0 && !players.get(r.p)?.shared)
    .sort((a, b) => b.s[field] - a.s[field] || games.get(a.g)!.date.localeCompare(games.get(b.g)!.date))
    .slice(0, limit)
    .map((r) => {
      const g = games.get(r.g)!;
      return { player: r.p, team: r.t, opponent: r.t === g.home ? g.away : g.home, game: g.id, date: g.date, season: g.season, value: r.s[field] };
    });
}

export function seasonRecords(all: Entry[], field: string, limit = 10) {
  return all
    .filter((e) => (e.stats[field] ?? 0) > 0)
    .sort((a, b) => b.stats[field] - a.stats[field] || a.season - b.season)
    .slice(0, limit)
    .map((e) => ({ player: e.player, season: e.season, teams: e.teams, games: e.games, value: e.stats[field] }));
}

export function careerRecords(all: Entry[], field: string, limit = 10) {
  const max = field.startsWith("longest");
  const m = new Map<string, { player: string; value: number; seasons: number[]; games: number }>();
  for (const e of all) {
    const v = e.stats[field] ?? 0;
    const c = m.get(e.player) ?? { player: e.player, value: 0, seasons: [], games: 0 };
    c.value = max ? Math.max(c.value, v) : Math.round((c.value + v) * 100) / 100;
    c.seasons.push(e.season);
    c.games += e.games;
    m.set(e.player, c);
  }
  return [...m.values()].filter((c) => c.value > 0).sort((a, b) => b.value - a.value).slice(0, limit);
}

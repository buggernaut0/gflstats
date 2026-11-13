/**
 * Simulator – Datenexport (nur Saison 2026).
 *
 *   npm run data   (läuft nach scripts/export-data.ts)
 *
 * Quelle sind ausschließlich die geprüften Website-Daten (web/public/data/*) der Saison 2026 sowie die
 * Aufstellungen, die export-data.ts daraus erzeugt (public/trapview/data/season-2026.json). Es werden keine Werte
 * erfunden. Das Skript fasst nur zusammen:
 *   - Saisonwerte je Spieler und Team (alle Spieler mit Einsatz, nicht nur die Starter),
 *   - Teamwerte „eigen“ (Summe der eigenen Zeilen) und „Gegner“ (Summe der gegnerischen Zeilen in den
 *     Spielen des Teams – daraus ergeben sich zugelassene Werte der Defense und erlittene Sacks der Offense),
 *   - Werte je Spieler gegen jeden einzelnen Gegner (direkte Aufeinandertreffen auf Teamebene),
 *   - zwei aus den Bögen per Regression abgeleitete Größen (Raumverlust pro Sack, siehe unten),
 *   - die echten Spielergebnisse 2026 (nur für den Rücktest).
 *
 * Ausgabe: web/public/trapview/data/sim-2026.json
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SimData, SimPlayer, SimTeam, Stats } from '../../src/trapview/sim/types.ts';

export const SIM_SEASON = 2026;

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const WEB_DATA = join(REPO, 'web', 'public', 'data');
const OUT_DIR = join(HERE, '..', '..', 'public', 'trapview', 'data');
const SEASON_FILE = join(OUT_DIR, `season-${SIM_SEASON}.json`);

if (!existsSync(SEASON_FILE)) {
  console.error(`\nSimulator: ${SEASON_FILE} fehlt – zuerst scripts/export-data.ts ausführen (npm run data).\n`);
  process.exit(1);
}

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf-8')) as T;

interface PgRow { g: string; p: string; t: string; s: Stats }
interface WebGame {
  id: string; season: number; type: string; date: string; home: string; away: string; homeScore: number | null; awayScore: number | null;
  teamStats?: Record<string, Record<string, number | string>>;
}
/** Teamwerte aus den Spielberichten (nicht in jedem Spiel erfasst – daher mit Spielanzahl). */
const GAME_KEYS = ['thirdAtt', 'thirdConv', 'fourthAtt', 'fourthConv', 'firstDowns', 'redzone', 'redzoneTd'];
interface WebTeam { id: string; name: string; abbr: string }
interface WebPlayer { id: string; name: string; shared: boolean; seasons: { season: number; role: string | null }[] }
interface SeasonFile {
  teams: { id: string; lineup: { offense: LineupE[]; defense: LineupE[] } }[];
}
interface LineupE { group: string; spot: [string, number]; player: { id: string; number: number | null } | null }

/** Spalten, die das Simulationsmodell verwendet. */
export const SIM_KEYS = [
  'pass', 'complete', 'interception', 'passingyards', 'touchdownpass', 'passuncatchable', 'passspiked',
  'run', 'runyards', 'runyardsloss', 'touchdownrun', 'longestrun',
  'catched', 'intended', 'receivingyards', 'touchdowncatch', 'droppedpass', 'yac', 'longestcatch',
  'fumbled', 'fumbledandlost',
  'tackletotal', 'tackleforloss', 'sacktotal', 'intercepted', 'brokenuppass', 'forcedfumble', 'qbhurrybydefense',
  'interceptionreturnyards', 'interceptionreturntouchdown', 'fumblereturntouchdown',
  'punt', 'puntyards', 'punttouchback', 'puntreturn', 'puntreturnyards', 'puntreturntouchdown',
  'kickoff', 'kickofftouchback', 'kickoffreturn', 'kickoffreturnyards', 'kickoffreturntouchdown',
  'fieldgoaltry', 'fieldgoalgood', 'fieldgoalyards', 'longestfieldgoal',
  'patkick', 'patkickgood', 'patrungood', 'patrunnogood', 'patpasscatchedgood', 'patpassnogood',
  'penalty', 'penaltyyards', 'points', 'touchdown',
];
const MAX_KEYS = new Set(['longestrun', 'longestcatch', 'longestfieldgoal']);

function add(into: Stats, s: Stats) {
  for (const k of SIM_KEYS) {
    const x = s[k];
    if (x === undefined) continue;
    into[k] = MAX_KEYS.has(k) ? Math.max(into[k] ?? 0, x) : Math.round(((into[k] ?? 0) + x) * 100) / 100;
  }
}

const rows = read<PgRow[]>(join(WEB_DATA, 'pg', `${SIM_SEASON}.json`));
const games = read<WebGame[]>(join(WEB_DATA, 'games.json')).filter((g) => g.season === SIM_SEASON);
const webTeams = read<WebTeam[]>(join(WEB_DATA, 'teams.json'));
const webPlayers = new Map(read<WebPlayer[]>(join(WEB_DATA, 'players.json')).map((p) => [p.id, p]));
const seasonFile = read<SeasonFile>(SEASON_FILE);

const gameById = new Map(games.map((g) => [g.id, g]));
const rowsByGame = new Map<string, PgRow[]>();
for (const r of rows) {
  if (!gameById.has(r.g)) continue;
  (rowsByGame.get(r.g) ?? rowsByGame.set(r.g, []).get(r.g)!).push(r);
}

// ── Teamwerte: eigen + Gegner ──────────────────────────────────────────────
const teamAgg = new Map<string, { games: Set<string>; own: Stats; opp: Stats }>();
const teamOf = (id: string) => teamAgg.get(id) ?? teamAgg.set(id, { games: new Set(), own: {}, opp: {} }).get(id)!;
for (const [gid, rs] of rowsByGame) {
  const teamIds = [...new Set(rs.map((r) => r.t))];
  for (const t of teamIds) {
    const a = teamOf(t);
    a.games.add(gid);
    for (const r of rs) add(r.t === t ? a.own : a.opp, r.s);
  }
}

// ── Spielerwerte (+ je Gegner) ─────────────────────────────────────────────
const playerAgg = new Map<string, { id: string; team: string; games: Set<string>; stats: Stats; vs: Map<string, { games: Set<string>; stats: Stats }> }>();
for (const r of rows) {
  const g = gameById.get(r.g);
  if (!g) continue;
  const key = `${r.p}|${r.t}`;
  const e = playerAgg.get(key) ?? playerAgg.set(key, { id: r.p, team: r.t, games: new Set(), stats: {}, vs: new Map() }).get(key)!;
  e.games.add(r.g);
  add(e.stats, r.s);
  const opp = g.home === r.t ? g.away : g.home;
  const o = e.vs.get(opp) ?? e.vs.set(opp, { games: new Set(), stats: {} }).get(opp)!;
  o.games.add(r.g);
  add(o.stats, r.s);
}

// ── Raumverlust pro Sack (Regression, siehe Kommentar) ─────────────────────
/**
 * Die Bögen verbuchen Sacks als Läufe des Quarterbacks (Korrelation erlittene Sacks ↔ QB-Raumverlust
 * je Team-Spiel ≈ −0,73). Die Sack-Yards stehen nirgends direkt. Sie werden per kleinster Quadrate
 * (ohne Achsenabschnitt) aus den Team-Spielen geschätzt:
 *   QB-Raumverlust ≈ a · (QB-Läufe − erlittene Sacks) + b · erlittene Sacks
 * b = Yards pro Sack, a = Raumverlust pro echtem QB-Lauf. Beide sind abgeleitete Simulationsparameter.
 */
function sackRegression() {
  let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
  for (const rs of rowsByGame.values()) {
    for (const t of new Set(rs.map((r) => r.t))) {
      const sacks = rs.filter((r) => r.t !== t).reduce((x, r) => x + (r.s.sacktotal ?? 0), 0);
      const qbs = rs.filter((r) => r.t === t && (r.s.pass ?? 0) > 3);
      const runs = qbs.reduce((x, r) => x + (r.s.run ?? 0), 0);
      const loss = qbs.reduce((x, r) => x + (r.s.runyardsloss ?? 0), 0);
      const x1 = Math.max(runs - sacks, 0), x2 = sacks;
      a11 += x1 * x1; a12 += x1 * x2; a22 += x2 * x2; b1 += x1 * loss; b2 += x2 * loss;
    }
  }
  const d = a11 * a22 - a12 * a12;
  return { perQbRun: (b1 * a22 - b2 * a12) / d, perSack: (a11 * b2 - a12 * b1) / d };
}
const reg = sackRegression();

// ── Zusammenbauen ──────────────────────────────────────────────────────────
const leagueTotals: Stats = {};
for (const r of rows) if (gameById.has(r.g)) add(leagueTotals, r.s);

const lineupInfo = new Map<string, { group: string; spot: string; number: number | null }>();
for (const t of seasonFile.teams) {
  for (const e of [...t.lineup.offense, ...t.lineup.defense]) {
    if (e.player) lineupInfo.set(`${e.player.id}|${t.id}`, { group: e.group, spot: `${e.spot[0]}${e.spot[1] + 1}`, number: e.player.number });
  }
}

const teams: SimTeam[] = [];
for (const [id, a] of [...teamAgg].sort((x, y) => x[0].localeCompare(y[0]))) {
  const wt = webTeams.find((t) => t.id === id);
  const players: SimPlayer[] = [];
  for (const e of playerAgg.values()) {
    if (e.team !== id) continue;
    const wp = webPlayers.get(e.id);
    if (wp?.shared) continue; // Sammeleinträge zweier Spieler nie simulieren
    const li = lineupInfo.get(`${e.id}|${id}`);
    players.push({
      id: e.id,
      name: wp?.name ?? e.id,
      number: li?.number ?? null,
      role: wp?.seasons.find((s) => s.season === SIM_SEASON)?.role ?? null,
      lineupGroup: li?.group ?? null,
      lineupSpot: li?.spot ?? null,
      games: e.games.size,
      stats: e.stats,
      vs: Object.fromEntries([...e.vs].map(([opp, o]) => [opp, { games: o.games.size, stats: o.stats }])),
    });
  }
  players.sort((x, y) => x.name.localeCompare(y.name, 'de'));
  // Spielberichte: Summe + Anzahl Spiele, in denen der Wert erfasst ist (fehlend ≠ 0)
  const report: Record<string, { sum: number; games: number }> = {};
  for (const g of games) {
    if (!rowsByGame.has(g.id)) continue;
    const ts = g.teamStats?.[id];
    if (!ts) continue;
    for (const k of GAME_KEYS) {
      const x = ts[k];
      if (typeof x !== 'number') continue;
      report[k] ??= { sum: 0, games: 0 };
      report[k].sum += x;
      report[k].games++;
    }
  }
  teams.push({ id, name: wt?.name ?? id, abbr: wt?.abbr ?? id.slice(0, 3).toUpperCase(), games: a.games.size, own: a.own, opp: a.opp, report, players });
}

const data: SimData = {
  season: SIM_SEASON,
  generatedAt: new Date().toISOString(),
  source: 'GFL-Statistikbögen 2026 (statsnscore.online) aus gflstats.db, aufbereitet durch scripts/build_data.py',
  league: {
    games: rowsByGame.size,
    teamGames: [...teamAgg.values()].reduce((x, t) => x + t.games.size, 0),
    totals: leagueTotals,
    sackYards: Math.round(reg.perSack * 100) / 100,
    qbRunLoss: Math.round(reg.perQbRun * 100) / 100,
  },
  teams,
  games: games
    .filter((g) => rowsByGame.has(g.id) && g.homeScore != null && g.awayScore != null)
    .map((g) => ({ id: g.id, date: g.date, type: g.type, home: g.home, away: g.away, homeScore: g.homeScore!, awayScore: g.awayScore! })),
};

writeFileSync(join(OUT_DIR, `sim-${SIM_SEASON}.json`), JSON.stringify(data));
console.log(`Simulator: sim-${SIM_SEASON}.json geschrieben  [${teams.length} Teams, ${data.games.length} Spiele, ${reg.perSack.toFixed(2)} Yards/Sack]`);

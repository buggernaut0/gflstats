/**
 * Simulator – Rücktest gegen die echten Spiele 2026.
 *
 *   npm run backtest [-- <Simulationen pro Spiel>]
 *
 * Jedes echte Spiel 2026 wird N-mal simuliert. Verglichen werden:
 *   1. Ligaschnitte pro Team-Spiel (Punkte, Spielzüge, Yards, Sacks, Turnovers, Punts, FG, Longest …)
 *   2. Vorhersage des Siegers (Trefferquote, Brier-Score, Kalibrierung)
 *
 * Achtung: Das Modell kennt die Saisonwerte 2026, also auch die Spiele, gegen die es geprüft wird
 * (In-Sample). Der Test zeigt, ob die Mechanik realistische Spiele erzeugt – er ist kein Beleg für
 * Vorhersagekraft bei neuen Spielen.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProfiles, simulateGame } from '../src/sim/index.ts';
import type { SimData, Stats } from '../src/sim/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, '..', 'public', 'data', 'sim-2026.json'), 'utf-8')) as SimData;
const pg = JSON.parse(readFileSync(resolve(HERE, '..', '..', 'web', 'public', 'data', 'pg', '2026.json'), 'utf-8')) as { g: string; t: string; s: Stats }[];
const webGames = JSON.parse(readFileSync(resolve(HERE, '..', '..', 'web', 'public', 'data', 'games.json'), 'utf-8')) as { id: string; teamStats?: Record<string, Record<string, number>> }[];
const reportOf = new Map(webGames.map((g) => [g.id, g.teamStats ?? {}]));
const N = Number(process.argv.slice(2).find((x) => /^\d+$/.test(x)) ?? 200);
const WRITE = process.argv.includes('--write');

const profiles = buildProfiles(data);
const v = (s: Stats, k: string) => s[k] ?? 0;

// ── Echte Werte je Team-Spiel ──
type Line = Record<string, number>;
const real: Line[] = [];
const byGame = new Map<string, typeof pg>();
for (const r of pg) (byGame.get(r.g) ?? byGame.set(r.g, []).get(r.g)!).push(r);
for (const g of data.games) {
  const rows = byGame.get(g.id) ?? [];
  for (const t of [g.home, g.away]) {
    const own = rows.filter((r) => r.t === t), opp = rows.filter((r) => r.t !== t);
    const sum = (rs: typeof rows, k: string) => rs.reduce((x, r) => x + v(r.s, k), 0);
    const max = (rs: typeof rows, k: string) => rs.reduce((x, r) => Math.max(x, v(r.s, k)), 0);
    const sacks = sum(opp, 'sacktotal');
    const rep = reportOf.get(g.id)?.[t];
    real.push({
      firstDowns: rep?.firstDowns ?? NaN,
      thirdAtt: rep?.thirdAtt ?? NaN,
      thirdConv: rep?.thirdAtt != null ? rep.thirdConv ?? 0 : NaN,
      fourthAtt: rep?.thirdAtt != null ? rep.fourthAtt ?? 0 : NaN,
      fourthConv: rep?.thirdAtt != null ? rep.fourthConv ?? 0 : NaN,
      points: t === g.home ? g.homeScore : g.awayScore,
      plays: sum(own, 'pass') + sum(own, 'run'),
      passAtt: sum(own, 'pass'),
      completions: sum(own, 'complete'),
      passYds: sum(own, 'passingyards'),
      rushAttInclSacks: sum(own, 'run'),
      rushYdsInclSacks: sum(own, 'runyards'),
      sacks,
      interceptions: sum(own, 'interception'),
      fumblesLost: sum(own, 'fumbledandlost'),
      punts: sum(own, 'punt'),
      fgTry: sum(own, 'fieldgoaltry'),
      longestPass: max(own, 'longestcatch'),
      longestRun: max(own, 'longestrun'),
    });
  }
}

// ── Simulation ──
const sim: Line[] = [];
let brier = 0, hits = 0, decided = 0;
const buckets = new Map<number, { n: number; wins: number; p: number }>();
let seed = 1;
for (const g of data.games) {
  let homeWins = 0, ties = 0;
  for (let i = 0; i < N; i++) {
    const r = simulateGame(profiles, { seed: seed++, home: g.home, away: g.away });
    const hs = r.score[g.home], as = r.score[g.away];
    if (hs > as) homeWins++; else if (hs === as) ties++;
    for (const t of [g.home, g.away]) {
      const s = r.team[t];
      const turnovers = r.events.filter((e) => e.offense === t && e.turnover);
      const snaps = r.events.filter((e) => e.offense === t && (e.type === 'pass' || e.type === 'run' || e.type === 'sack'));
      const conv = (e: (typeof snaps)[number]) => e.firstDown || e.outcome === 'touchdown';
      sim.push({
        firstDowns: s.firstDowns,
        thirdAtt: snaps.filter((e) => e.down === 3).length,
        thirdConv: snaps.filter((e) => e.down === 3 && conv(e)).length,
        fourthAtt: snaps.filter((e) => e.down === 4).length,
        fourthConv: snaps.filter((e) => e.down === 4 && conv(e)).length,
        points: r.score[t],
        plays: s.plays,
        passAtt: s.passAtt,
        completions: Object.values(r.box).filter((b) => b.team === t).reduce((x, b) => x + b.complete, 0),
        passYds: s.passYds,
        rushAttInclSacks: s.rushAtt + s.sacks,
        rushYdsInclSacks: s.rushYds + r.events.filter((e) => e.offense === t && e.type === 'sack').reduce((x, e) => x + e.yards, 0),
        sacks: s.sacks,
        interceptions: turnovers.filter((e) => e.outcome === 'interception').length,
        fumblesLost: turnovers.filter((e) => e.outcome === 'fumble_lost').length,
        punts: s.punts,
        fgTry: s.fgTry,
        longestPass: s.longestPass,
        longestRun: s.longestRun,
      });
    }
  }
  const p = (homeWins + ties / 2) / N;
  if (g.homeScore === g.awayScore) continue;
  const actual = g.homeScore > g.awayScore ? 1 : 0;
  decided++;
  brier += (p - actual) ** 2;
  if ((p > 0.5 ? 1 : 0) === actual) hits++;
  const b = Math.min(4, Math.floor(Math.max(p, 1 - p) * 10) - 5); // 50–59 … 90–100 %
  const e = buckets.get(b) ?? { n: 0, wins: 0, p: 0 };
  e.n++; e.wins += (p >= 0.5 ? actual : 1 - actual); e.p += Math.max(p, 1 - p);
  buckets.set(b, e);
}

/** Mittelwert über die Team-Spiele, in denen der Wert erfasst ist (NaN = im Spielbericht nicht vorhanden). */
const mean = (xs: Line[], k: string) => {
  const ok = xs.filter((l) => !Number.isNaN(l[k]));
  return ok.reduce((x, l) => x + l[k], 0) / ok.length;
};
console.log(`\nRücktest Saison 2026 – ${data.games.length} Spiele × ${N} Simulationen (In-Sample)\n`);
console.log('Kennzahl pro Team-Spiel'.padEnd(26) + 'echt'.padStart(8) + 'sim'.padStart(8) + '  Abw.');
for (const k of Object.keys(real[0])) {
  const a = mean(real, k), b = mean(sim, k);
  console.log(k.padEnd(26) + a.toFixed(1).padStart(8) + b.toFixed(1).padStart(8) + `  ${(b - a >= 0 ? '+' : '')}${((b - a) / Math.max(Math.abs(a), 0.01) * 100).toFixed(0)} %`);
}
console.log(`\nSieger richtig: ${hits}/${decided} (${(hits / decided * 100).toFixed(0)} %) · Brier-Score ${(brier / decided).toFixed(3)} (Münzwurf: 0,250)`);
console.log('Kalibrierung (Favoriten-Chance → tatsächliche Siegquote des Favoriten):');
for (const [b, e] of [...buckets].sort((x, y) => x[0] - y[0])) {
  console.log(`  ${50 + b * 10}–${59 + b * 10 + (b === 4 ? 1 : 0)} %: ${e.n} Spiele, Ø Prognose ${(e.p / e.n * 100).toFixed(0)} %, Favorit gewann ${(e.wins / e.n * 100).toFixed(0)} %`);
}

// ── Ergebnis für die Erklärseite (npm run data schreibt es mit wenigen Durchläufen) ──
if (WRITE) {
  const LABELS: Record<string, string> = {
    points: 'Punkte', plays: 'Spielzüge', firstDowns: 'First Downs', thirdConv: '3rd-Down-Conversions', fourthAtt: '4th-Down-Versuche',
    passAtt: 'Passversuche', completions: 'Completions', passYds: 'Pass-Yards', rushAttInclSacks: 'Läufe (inkl. Sacks)',
    rushYdsInclSacks: 'Lauf-Yards (inkl. Sacks)', sacks: 'Sacks', interceptions: 'Interceptions', fumblesLost: 'Fumbles verloren',
    punts: 'Punts', fgTry: 'Field-Goal-Versuche', longestPass: 'Längster Pass', longestRun: 'Längster Lauf',
  };
  const out = {
    season: data.season,
    generatedAt: new Date().toISOString(),
    games: data.games.length,
    runsPerGame: N,
    rows: Object.keys(LABELS).map((k) => ({ key: k, label: LABELS[k], real: Math.round(mean(real, k) * 10) / 10, sim: Math.round(mean(sim, k) * 10) / 10 })),
    winner: { hits, decided, brier: Math.round((brier / decided) * 1000) / 1000 },
    calibration: [...buckets].sort((x, y) => x[0] - y[0]).map(([b, e]) => ({ from: 50 + b * 10, games: e.n, predicted: Math.round((e.p / e.n) * 100), actual: Math.round((e.wins / e.n) * 100) })),
  };
  writeFileSync(join(HERE, '..', 'public', 'data', `sim-${data.season}-backtest.json`), JSON.stringify(out));
  console.log(`\nGeschrieben: public/data/sim-${data.season}-backtest.json`);
}

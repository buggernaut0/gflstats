/**
 * Tests des Spotlight-Bewertungsmodells (node --test). Synthetische Ligen für die Regeln, dazu ein
 * Abgleich mit den exportierten Daten (public/trapview/data, `npm run data`): Auswahl nur aus der
 * Starting Lineup, Gründe = echte Saisonwerte.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildPools, pickSpotlight, SPOTLIGHT_RULES, type PoolPlayer } from './scoring.ts';

const ALL = [
  'pass', 'complete', 'passingyards', 'touchdownpass', 'interception', 'run', 'runyards', 'touchdownrun',
  'catched', 'receivingyards', 'touchdowncatch', 'intended', 'droppedpass', 'fumbledandlost',
  'tackletotal', 'tackleforloss', 'sacktotal', 'intercepted', 'brokenuppass', 'forcedfumble', 'qbhurrybydefense',
];

/** Liga mit 12 Receivern (Durchschnitt) und 12 Verteidigern. */
function league(extra: PoolPlayer[] = []): PoolPlayer[] {
  const out: PoolPlayer[] = [];
  for (let i = 0; i < 12; i++) {
    out.push({ id: `wr${i}`, team: `t${i % 4}`, role: 'WR/TE', games: 10, stats: { catched: 20 + i, receivingyards: 250 + i * 20, touchdowncatch: 2 + (i % 3), intended: 35 + i, droppedpass: 2 } });
    out.push({ id: `d${i}`, team: `t${i % 4}`, role: 'DEF', games: 10, stats: { tackletotal: 20 + i * 2, tackleforloss: i % 4, sacktotal: i % 3, intercepted: i % 2, brokenuppass: i % 5, forcedfumble: 0 } });
  }
  return [...out, ...extra];
}

test('kleine Stichprobe: ein Ausreißerspiel schlägt keine starke Saison', () => {
  const oneHit: PoolPlayer = { id: 'flash', team: 'x', role: 'WR/TE', games: 3, stats: { catched: 12, receivingyards: 260, touchdowncatch: 3, intended: 15, droppedpass: 0 } };
  const steady: PoolPlayer = { id: 'steady', team: 'x', role: 'WR/TE', games: 12, stats: { catched: 70, receivingyards: 1050, touchdowncatch: 10, intended: 100, droppedpass: 2 } };
  const pools = buildPools(league([oneHit, steady]), ALL);
  const picks = pickSpotlight(pools, 'x', [{ id: 'flash', group: 'REC' }, { id: 'steady', group: 'REC' }]);
  assert.equal(picks[0].id, 'steady');
});

test('nur Kandidaten aus der Lineup, höchstens drei, kein Spieler doppelt', () => {
  const pools = buildPools(league(), ALL);
  const cands = ['wr11', 'wr10', 'wr9', 'wr8', 'd11'].map((id) => ({ id, group: id.startsWith('wr') ? 'REC' : 'DEF' }));
  // Team t3: wr11, d11 … – nur deren Spieler finden sich unter Team t3
  const picks = pickSpotlight(pools, 't3', cands);
  assert.ok(picks.length <= SPOTLIGHT_RULES.perUnit);
  assert.equal(new Set(picks.map((p) => p.id)).size, picks.length);
  for (const p of picks) assert.ok(cands.some((c) => c.id === p.id));
  for (const p of picks) assert.ok(['wr11', 'd11'].includes(p.id), `${p.id} spielt nicht für t3`);
});

test('schwaches Team: kein erfundener Star, höchstens ein Schlüsselspieler', () => {
  const weak: PoolPlayer = { id: 'weak', team: 'w', role: 'WR/TE', games: 10, stats: { catched: 11, receivingyards: 90, touchdowncatch: 0, intended: 30, droppedpass: 6 } };
  const pools = buildPools(league([weak]), ALL);
  const picks = pickSpotlight(pools, 'w', [{ id: 'weak', group: 'REC' }]);
  assert.ok(picks.length === 0 || (picks.length === 1 && picks[0].tier === 'key'));
  assert.equal(picks.length, 0, 'deutlich unter Ligamittel – gar keine Karte');
});

test('fehlende Spalten einer Saison entfallen, Gewichte werden neu normiert', () => {
  const noDrops = ALL.filter((c) => c !== 'droppedpass' && c !== 'intended');
  const pools = buildPools(league(), noDrops);
  const picks = pickSpotlight(pools, 't3', [{ id: 'wr11', group: 'REC' }]);
  assert.equal(picks.length, 1);
  assert.ok(!picks[0].metrics.some((m) => m.metric === 'drop_rate' || m.metric === 'catch_rate'));
  assert.ok(picks[0].score >= 0 && picks[0].score <= 100);
});

test('Defense ohne Kader: bestes Statistikprofil zählt (Pass Rusher)', () => {
  const rusher: PoolPlayer = { id: 'rush', team: 'r', role: 'DEF', games: 10, stats: { tackletotal: 35, tackleforloss: 12, sacktotal: 9, forcedfumble: 2 } };
  const pools = buildPools(league([rusher]), ALL);
  const [pick] = pickSpotlight(pools, 'r', [{ id: 'rush', group: 'DEF' }]);
  assert.equal(pick.profile, 'rusher');
  assert.equal(pick.reasons[0].label, 'Sacks');
  assert.equal(pick.reasons[0].value, 9);
});

// ─────────────────────────────────────────────── Abgleich mit den exportierten Daten

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', '..', '..', 'public', 'trapview', 'data');

test('Export: Picks stehen in der Lineup, Gründe sind echte Saisonwerte', { skip: !existsSync(join(DATA, 'index.json')) && 'npm run data fehlt' }, () => {
  const index = JSON.parse(readFileSync(join(DATA, 'index.json'), 'utf-8')) as { seasons: { season: number }[] };
  let checked = 0;
  for (const { season } of index.seasons) {
    const data = JSON.parse(readFileSync(join(DATA, `season-${season}.json`), 'utf-8'));
    for (const team of data.teams) {
      for (const side of ['offense', 'defense'] as const) {
        const picks = team.spotlight?.[side] ?? [];
        assert.ok(picks.length <= 3);
        for (const pick of picks) {
          const entry = team.lineup[side].find((e: { player: { id: string } | null }) => e.player?.id === pick.id);
          assert.ok(entry, `${season} ${team.id}: ${pick.id} nicht in der Lineup (${side})`);
          const stats = entry.player.stats as Record<string, number>;
          for (const r of pick.reasons) {
            if (r.metric === 'sacks') assert.equal(r.value, stats.sacktotal ?? 0);
            if (r.metric === 'rec_yds') assert.equal(r.value, stats.receivingyards ?? 0);
            if (r.metric === 'pass_yds') assert.equal(r.value, stats.passingyards ?? 0);
            if (r.metric === 'tackles') assert.equal(r.value, stats.tackletotal ?? 0);
            if (r.metric === 'ypc') assert.ok(Math.abs(r.value - (stats.runyards ?? 0) / stats.run) < 1e-9);
          }
          if (pick.tier !== 'key') assert.ok(pick.score >= SPOTLIGHT_RULES.MIN_SCORE);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 100, `nur ${checked} Picks geprüft`);
});

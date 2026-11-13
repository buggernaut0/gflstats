/**
 * Tests der Simulations-Engine (node --test). Benötigt public/data/sim-2026.json (npm run data).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProfiles, simulateGame } from './index.ts';
import { combine, shrink } from './model.ts';
import type { SimData } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'public', 'trapview', 'data', 'sim-2026.json'), 'utf-8')) as SimData;
const profiles = buildProfiles(data);
const [a, b] = [data.teams[0].id, data.teams[1].id];

test('Datenbasis ist ausschließlich Saison 2026', () => {
  assert.equal(data.season, 2026);
  assert.ok(data.games.length > 0);
  assert.ok(data.games.every((g) => g.date.startsWith('2026')));
});

test('Shrinkage und Kombination', () => {
  assert.equal(shrink(0, 0, 0.6, 50), 0.6); // ohne Versuche: Ligaschnitt
  assert.ok(Math.abs(shrink(90, 100, 0.6, 50) - 0.8) < 1e-9);
  // Werte auf Liganiveau verändern nichts
  assert.ok(Math.abs(combine(0.6, [{ rate: 0.3, ref: 0.3, w: 1 }]) - 0.6) < 1e-9);
  // besserer Wert → höhere Chance, schlechterer → niedrigere
  assert.ok(combine(0.6, [{ rate: 0.4, ref: 0.3, w: 1 }]) > 0.6);
  assert.ok(combine(0.6, [{ rate: 0.2, ref: 0.3, w: 1 }]) < 0.6);
});

test('gleicher Seed → identisches Spiel, anderer Seed → anderes Spiel', () => {
  const g1 = simulateGame(profiles, { seed: 42, home: a, away: b });
  const g2 = simulateGame(profiles, { seed: 42, home: a, away: b });
  const g3 = simulateGame(profiles, { seed: 43, home: a, away: b });
  assert.deepEqual(g1, g2);
  assert.notDeepEqual(g1.events.map((e) => e.text), g3.events.map((e) => e.text));
});

test('Spielregeln: Punkte, Downs, Feldposition, Viertel', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const g = simulateGame(profiles, { seed, home: a, away: b });
    const pts: Record<string, number> = { [a]: 0, [b]: 0 };
    for (const e of g.events) {
      if (e.points) pts[e.points.team] += e.points.points;
      assert.ok(e.quarter >= 1 && e.quarter <= 4, 'Viertel 1–4');
      assert.ok(e.yardLine >= 0 && e.yardLine <= 100, `Feldposition ${e.yardLine}`);
      if (e.type === 'pass' || e.type === 'run' || e.type === 'sack') {
        assert.ok(e.down >= 1 && e.down <= 4, `Down ${e.down}`);
        assert.ok(e.distance >= 1, `Distanz ${e.distance}`);
      }
      for (const c of e.chances) assert.ok(c.p >= 0 && c.p <= 1, `${c.label}: ${c.p}`);
    }
    assert.deepEqual(pts, g.score, 'Spielstand = Summe der Punkte-Ereignisse');
    assert.equal(g.events.at(-1)!.quarter, 4);
    assert.ok(g.events.length > 80 && g.events.length < 260, `Ereignisse: ${g.events.length}`);
  }
});

test('nur echte Spieler der beiden Teams handeln', () => {
  const ids = (team: string) => new Set(data.teams.find((t) => t.id === team)!.players.map((p) => p.id));
  const all = new Set([...ids(a), ...ids(b)]);
  for (let seed = 1; seed <= 20; seed++) {
    const g = simulateGame(profiles, { seed, home: a, away: b });
    for (const e of g.events) for (const id of Object.values(e.actors)) assert.ok(id && all.has(id), `unbekannter Spieler ${id}`);
  }
});

test('stärkeres Team gewinnt langfristig häufiger, aber nicht immer', () => {
  // Stärke laut echter Punktdifferenz 2026
  const diff = (id: string) => {
    const t = data.teams.find((x) => x.id === id)!;
    return (t.own.points ?? 0) - (t.opp.points ?? 0);
  };
  const sorted = [...data.teams].sort((x, y) => diff(y.id) - diff(x.id));
  const strong = sorted[0].id, weak = sorted.at(-1)!.id;
  let wins = 0;
  const N = 300;
  for (let seed = 1; seed <= N; seed++) {
    const home = seed % 2 ? strong : weak;
    const g = simulateGame(profiles, { seed, home, away: home === strong ? weak : strong });
    if (g.score[strong] > g.score[weak]) wins++;
  }
  assert.ok(wins / N > 0.8, `Favorit gewinnt ${wins}/${N}`);
  assert.ok(wins < N, 'Zufall muss Überraschungen zulassen');
});

test('Mehrfachsimulation: Summen stimmen, Ergebnis wiederholbar', async () => {
  const { MultiSim } = await import('./multi.ts');
  const m1 = new MultiSim(profiles, a, b, 1000);
  m1.run(200);
  const r = m1.result();
  assert.equal(r.runs, 200);
  assert.equal(r.wins[a] + r.wins[b] + r.ties, 200);
  assert.equal(r.margins.reduce((x, m) => x + m.count, 0), 200);
  assert.ok(r.close >= 0 && r.close <= 1);
  const m2 = new MultiSim(profiles, a, b, 1000);
  m2.run(120); m2.run(80); // in Häppchen = am Stück
  assert.deepEqual(m2.result(), r);
});

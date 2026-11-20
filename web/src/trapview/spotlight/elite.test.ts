// Elite: beste zehn je Positionsgruppe. Ausführen: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPools, type PoolPlayer } from './scoring.ts';
import { ELITE_TOP, eliteBoard } from './elite.ts';

const COLS = ['pass', 'complete', 'passingyards', 'touchdownpass', 'interception', 'run', 'runyards', 'touchdownrun', 'catched', 'receivingyards', 'touchdowncatch', 'intended', 'tackletotal', 'tackleforloss', 'sacktotal', 'intercepted', 'brokenuppass'];

/** Künstliche Liga: je Rolle 15 Spieler mit klar abgestufter Leistung (i = 0 ist der beste). */
function league(): PoolPlayer[] {
  const out: PoolPlayer[] = [];
  for (let i = 0; i < 15; i++) {
    const k = 15 - i;
    out.push({ id: `qb${i}`, team: 't', role: 'QB', games: 10, stats: { pass: 300, complete: 150 + k * 5, passingyards: 1500 + k * 120, touchdownpass: 5 + k, interception: 10, run: 20, runyards: 50 + k * 5 } });
    out.push({ id: `rb${i}`, team: 't', role: 'RB', games: 10, stats: { run: 100, runyards: 300 + k * 40, touchdownrun: k, catched: 5, receivingyards: 30 } });
    out.push({ id: `wr${i}`, team: 't', role: 'WR/TE', games: 10, stats: { catched: 20 + k * 2, receivingyards: 250 + k * 40, touchdowncatch: k, intended: 60 } });
    out.push({ id: `df${i}`, team: 't', role: 'DEF', games: 10, stats: { tackletotal: 20 + k * 3, tackleforloss: k, sacktotal: k / 2, intercepted: k / 5, brokenuppass: k / 3 } });
  }
  return out;
}

test('Elite: höchstens zehn je Positionsgruppe, jede Gruppe für sich gerankt', () => {
  const board = eliteBoard(buildPools(league(), COLS));
  const byGroup = new Map<string, string[]>();
  for (const [id, list] of board) for (const e of list) byGroup.set(e.profile, [...(byGroup.get(e.profile) ?? []), id]);
  for (const [profile, ids] of byGroup) assert.ok(ids.length <= ELITE_TOP, `${profile}: ${ids.length}`);
  // Offense-Gruppen enthalten nur Spieler ihrer Rolle – kein Vergleich über Positionen hinweg
  assert.ok(byGroup.get('qb')!.every((id) => id.startsWith('qb')));
  assert.ok(byGroup.get('rb')!.every((id) => id.startsWith('rb')));
  assert.ok(byGroup.get('rec')!.every((id) => id.startsWith('wr')));
  for (const p of ['rusher', 'tackler', 'coverage']) assert.ok(byGroup.get(p)!.every((id) => id.startsWith('df')), p);
  // Die besten fünf jeder Gruppe sind dabei, die schwächsten nicht
  assert.equal(board.get('qb0')?.find((e) => e.profile === 'qb')?.rank, 1);
  assert.ok(!board.has('qb14') && !board.has('rb14') && !board.has('wr14'));
});

test('Elite: Gleichstand – mehr Spiele zuerst, dann Spieler-ID', () => {
  const same = { pass: 300, complete: 180, passingyards: 2500, touchdownpass: 15, interception: 8, run: 20, runyards: 80 };
  const players: PoolPlayer[] = Array.from({ length: 12 }, (_, i) => ({ id: `q${String(i).padStart(2, '0')}`, team: 't', role: 'QB', games: 10, stats: { ...same } }));
  const board = eliteBoard(buildPools(players, COLS));
  const ranked = [...board].filter(([, l]) => l[0].profile === 'qb').sort((a, b) => a[1][0].rank - b[1][0].rank).map(([id]) => id);
  assert.deepEqual(ranked, ['q00', 'q01', 'q02', 'q03', 'q04', 'q05', 'q06', 'q07', 'q08', 'q09']);
});

test('Elite: zu kleine Vergleichsgruppe ergibt keinen Elite-Status', () => {
  const few = league().filter((p) => p.role !== 'RB' || Number(p.id.slice(2)) < 5);
  const board = eliteBoard(buildPools(few, COLS));
  assert.ok(![...board.values()].flat().some((e) => e.profile === 'rb'));
});

/**
 * Tests der 2D-Choreografie (node --test): 22 Spieler je Spielzug, gültige Koordinaten,
 * beteiligte Spieler sind tatsächlich auf dem Feld. Benötigt public/data/sim-2026.json.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProfiles, simulateGame } from '../sim/index.ts';
import type { SimData } from '../sim/types.ts';
import { FORMATION } from '../data/formation.ts';
import { sceneAt } from './choreo.ts';
import type { Slot, TeamUnits } from './roster.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, '..', '..', 'public', 'data', 'sim-2026.json'), 'utf-8')) as SimData;
const profiles = buildProfiles(data);

/** Formation ohne Spieler (alle Plätze unbesetzt) – die Choreografie setzt die Beteiligten selbst ein. */
const empty = (side: 'offense' | 'defense'): Slot[] =>
  FORMATION[side].filter((s) => s.role !== 'RB2').map((s) => ({ role: s.role, pos: s.position, x: s.x, y: s.y, id: null, name: null, number: null }));
const units = (): TeamUnits => ({ offense: empty('offense'), defense: empty('defense') });

test('22 Spieler, gültige Koordinaten, Beteiligte auf dem Feld', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const g = data.games[seed];
    const r = simulateGame(profiles, { seed, home: g.home, away: g.away });
    const names = new Map<string, { name: string; number: number | null }>();
    for (const t of data.teams) for (const p of t.players) names.set(`${t.id}|${p.id}`, { name: p.name, number: p.number });
    const ctx = { home: g.home, nextStartAbs: null, units: { [g.home]: units(), [g.away]: units() }, names };
    for (const e of r.events) {
      for (let t = 0; t <= 1.0001; t += 0.125) {
        const s = sceneAt(e, t, ctx);
        assert.equal(s.dots.length, 22, `${e.type}: ${s.dots.length} Spieler`);
        for (const d of [...s.dots.map((x) => x.at), s.ball]) {
          assert.ok(Number.isFinite(d.x) && Number.isFinite(d.y), `${e.type} ${e.outcome}: ungültige Koordinate`);
          assert.ok(d.x >= -15 && d.x <= 115 && Math.abs(d.y) <= 27, `${e.type} ${e.outcome}: außerhalb (${d.x}, ${d.y})`);
        }
        const onField = new Set(s.dots.map((x) => x.id).filter(Boolean));
        for (const id of [e.actors.passer, e.actors.target, e.actors.rusher, e.actors.tackler]) {
          if (id && (e.type === 'pass' || e.type === 'run' || e.type === 'sack')) assert.ok(onField.has(id), `${e.type}: ${id} fehlt auf dem Feld`);
        }
      }
    }
  }
});

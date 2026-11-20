/**
 * Simulation in beiden Sprachen (node --test): derselbe Seed ergibt dasselbe Spiel, nur die Texte wechseln.
 * Benötigt public/trapview/data/sim-2026.json (npm run data).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProfiles, simulateGame } from './index.ts';
import type { SimData } from './types.ts';
import { simText as EN } from '../../i18n/en/sim.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'public', 'trapview', 'data', 'sim-2026.json'), 'utf-8')) as SimData;
const profiles = buildProfiles(data);
const [a, b] = [data.teams[0].id, data.teams[1].id];

test('Englisch: gleicher Seed → gleiches Spiel, nur andere Texte', () => {
  const de = simulateGame(profiles, { seed: 7, home: a, away: b });
  const en = simulateGame(profiles, { seed: 7, home: a, away: b, text: EN });
  assert.deepEqual(en.score, de.score);
  assert.deepEqual(en.events.map((e) => [e.outcome, e.yards, e.quarter, e.clock]), de.events.map((e) => [e.outcome, e.yards, e.quarter, e.clock]));
  assert.notDeepEqual(en.events.map((e) => e.text), de.events.map((e) => e.text));
});

test('Englisch: keine deutschen Wörter in Spielverlauf und Wahrscheinlichkeiten', () => {
  const german = /\b(Lauf|gelingt|scheitert|verfehlt|erobert|Ballverlust|unvollständig|abgewehrt|Strafe|gegen|Ligaschnitt|geglättet|erwartet|Spiele?|Gewicht|lässt|fängt|erleidet)\b/;
  for (let seed = 1; seed <= 20; seed++) {
    const g = simulateGame(profiles, { seed, home: a, away: b, text: EN });
    for (const e of g.events) {
      // Spielernamen könnten zufällig ein Wort enthalten – geprüft wird der Text ohne Namen der Box Score
      const names = Object.values(g.box).map((x) => x.name);
      const strip = (s: string) => names.reduce((t, n) => t.split(n).join(''), s);
      assert.ok(!german.test(strip(e.text)), e.text);
      for (const c of e.chances) {
        assert.ok(!german.test(strip(c.label)), c.label);
        if (c.basis) assert.ok(!german.test(strip(c.basis)), c.basis);
      }
    }
  }
});

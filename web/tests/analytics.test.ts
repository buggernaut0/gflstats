// Tests fuer Kennzahlen, Perzentile, Abfragen und Team-Kennzahlen. Ausfuehren: npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { decodeConditions, encodeConditions, matches, testCondition } from "../src/lib/query.ts";
import { percentile, stat, value, median } from "../src/lib/stats.ts";
import { teamSeasonMetrics } from "../src/lib/team.ts";

test("Perzentil nach Mittelrang-Methode", () => {
  assert.equal(percentile(10, [1, 2, 3, 10]), 87.5); // 3 schlechter + halber Gleichstand von 1 => 3,5/4
  assert.equal(percentile(1, [1, 2, 3, 10]), 12.5);
  assert.equal(percentile(1, [1, 2, 3, 10], true), 87.5); // weniger ist besser
  assert.equal(percentile(5, [5, 5, 5, 5]), 50);
});

test("Median", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);
});

test("Berechnete Kennzahlen", () => {
  assert.equal(value(stat("ypc"), { runyards: 100, run: 20 }, 1), 5);
  assert.equal(value(stat("cmpPct"), { complete: 30, pass: 40 }, 1), 75);
  assert.equal(value(stat("recYdsPg"), { receivingyards: 1200 }, 12), 100);
  assert.equal(value(stat("ypr"), { receivingyards: 0, catched: 0 }, 1), null); // keine Division durch 0
});

test("Bedingungen: UND, ODER, zwischen", () => {
  const vals: Record<string, number> = { a: 10, b: 3 };
  const get = (k: string) => vals[k] ?? null;
  assert.ok(matches([{ stat: "a", op: "gte", a: 10 }, { stat: "b", op: "lte", a: 3 }], "and", get));
  assert.ok(!matches([{ stat: "a", op: "gt", a: 10 }, { stat: "b", op: "lt", a: 3 }], "and", get));
  assert.ok(matches([{ stat: "a", op: "gt", a: 10 }, { stat: "b", op: "eq", a: 3 }], "or", get));
  assert.ok(testCondition({ stat: "a", op: "between", a: 12, b: 8 }, 10)); // Grenzen in beliebiger Reihenfolge
  assert.ok(!testCondition({ stat: "a", op: "gte", a: 0 }, null)); // nicht erfasst erfuellt nichts
});

test("Bedingungen ueberleben den Weg durch die Adresse", () => {
  const c = [{ stat: "receivingyards", op: "gte" as const, a: 200 }, { stat: "ypc", op: "between" as const, a: 4.5, b: 7 }];
  assert.deepEqual(decodeConditions(encodeConditions(c), () => true), c);
  assert.deepEqual(decodeConditions("unbekannt:gte:1", (s) => s !== "unbekannt"), []);
});

const DATA = new URL("../public/data/", import.meta.url);
const has = fs.existsSync(new URL("meta.json", DATA));
const load = (f: string) => JSON.parse(fs.readFileSync(new URL(f, DATA), "utf-8"));

test("Team-Punkte pro Spiel = Endstaende / Spiele", { skip: !has && "keine Daten erzeugt" }, () => {
  const ts = load("team_seasons.json");
  const games = load("games.json");
  const rows = teamSeasonMetrics(ts, games);
  const r = rows.find((x) => x.scope === "regular")!;
  const mine = games.filter((g: { season: number; type: string; home: string; away: string }) => g.season === r.season && g.type === "regular" && (g.home === r.team || g.away === r.team));
  const pts = mine.reduce((s: number, g: { home: string; homeScore: number; awayScore: number }) => s + (g.home === r.team ? g.homeScore : g.awayScore), 0);
  assert.equal(r.values.ppg, pts / mine.length);
});

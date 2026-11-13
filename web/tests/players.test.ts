// Tests fuer die Spielersuche (Spielerseite). Ausfuehren: npm test (Node 22.18+).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { CAREER_STAT_OPTIONS, PLAYER_STAT_OPTIONS, STAT_OPTIONS, baseKey, careerRows, isCareerKey, rowRecorded, rowValue, seasonRows, type PRow } from "../src/lib/explore.ts";
import { decodeConditions, encodeConditions, matches } from "../src/lib/query.ts";
import { STAT, STATS, stat } from "../src/lib/stats.ts";

const data = (f: string) => new URL(`../public/data/${f}`, import.meta.url);
const has = fs.existsSync(data("player_seasons.json"));
const load = (f: string) => JSON.parse(fs.readFileSync(data(f), "utf8"));

test("Statistiksuche bietet den kompletten Kennzahlen-Katalog an", () => {
  assert.equal(STAT_OPTIONS.length, STATS.length);
  assert.deepEqual(new Set(STAT_OPTIONS.map((o) => o.key)), new Set(STATS.map((s) => s.key)));
  for (const k of ["passingyards", "touchdownpass", "pass", "complete", "cmpPct", "runyards", "run", "receivingyards", "catched", "tackletotal", "sacktotal", "intercepted"]) {
    assert.ok(STAT.has(k), `${k} fehlt im Katalog`);
  }
});

test("Spielersuche: jede Kennzahl als Saison- und als Karrierewert auswaehlbar", () => {
  assert.equal(PLAYER_STAT_OPTIONS.length, STATS.length * 2);
  assert.equal(new Set(PLAYER_STAT_OPTIONS.map((o) => o.key)).size, PLAYER_STAT_OPTIONS.length, "keine doppelten Schluessel");
  for (const o of CAREER_STAT_OPTIONS) {
    assert.ok(isCareerKey(o.key) && STAT.has(baseKey(o.key)), o.key);
    assert.ok(o.label.startsWith("Karriere: "));
  }
  for (const k of ["runyards", "touchdownrun", "receivingyards", "touchdowncatch", "catched", "kickoffreturn", "kickoffreturnyards", "tackletotal", "sacktotal", "intercepted", "passingyards"]) {
    assert.ok(PLAYER_STAT_OPTIONS.some((o) => o.key === k), `${k} (Saison) fehlt`);
    assert.ok(PLAYER_STAT_OPTIONS.some((o) => o.key === `k.${k}`), `${k} (Karriere) fehlt`);
  }
});

test("Unfertige Bedingungen (ohne Kennzahl oder Wert) filtern nicht und landen nicht im Link", () => {
  const get = () => 10;
  assert.equal(matches([{ stat: "", op: "gte", a: NaN }], "and", get), true);
  assert.equal(matches([{ stat: "runyards", op: "gte", a: NaN }, { stat: "runyards", op: "gte", a: 20 }], "and", get), false);
  assert.equal(matches([{ stat: "runyards", op: "gte", a: NaN }, { stat: "runyards", op: "gte", a: 5 }], "and", get), true);
  assert.equal(encodeConditions([{ stat: "", op: "gte", a: 5 }, { stat: "k.runyards", op: "gte", a: NaN }, { stat: "k.runyards", op: "gte", a: 2000 }]), "k.runyards:gte:2000");
  assert.deepEqual(decodeConditions("k.runyards:gte:2000~foo:gte:1", (s) => STAT.has(baseKey(s))), [{ stat: "k.runyards", op: "gte", a: 2000 }]);
});

test("Nicht erfasste Kennzahl: n. e., nicht 0, erfuellt keine Bedingung", () => {
  const availability = { qbhurry: [2025, 2026] };
  const row: PRow = { key: "x|2024", player: "x", name: "X", season: 2024, seasons: [2024], teams: ["t"], role: "DEF", games: 10, stats: {} };
  assert.equal(rowRecorded(stat("qbhurry"), row, availability), false);
  assert.equal(rowValue(stat("qbhurry"), row, availability), null);
  const get = (k: string) => rowValue(stat(k), row, availability);
  assert.equal(matches([{ stat: "qbhurry", op: "lte", a: 5 }], "and", get), false, "nicht erfasst darf nicht wie 0 zaehlen");
  const later = { ...row, season: 2025, seasons: [2025] };
  assert.equal(rowValue(stat("qbhurry"), later, availability), 0, "erfasst, aber kein Eintrag = 0");
});

test("Geteilte Links: Bedingungen samt Bereich und Dezimalwerten bleiben erhalten", () => {
  const conds = [{ stat: "ypc", op: "between" as const, a: 4.5, b: 7 }, { stat: "run", op: "gte" as const, a: 60 }];
  assert.deepEqual(decodeConditions(encodeConditions(conds), (s) => STAT.has(s)), conds);
});

test("Echte Daten: Saison-, Team-, Rollen- und UND/ODER-Filter", { skip: !has && "keine Daten erzeugt" }, () => {
  const players = new Map((load("players.json") as { id: string; shared: boolean }[]).map((p) => [p.id, p]));
  const ps = load("player_seasons.json");
  const meta = load("meta.json");
  const rows = seasonRows(ps, players as never, "all");
  const r2025 = rows.filter((r) => r.season === 2025);
  assert.ok(r2025.length > 0 && r2025.every((r) => r.season === 2025));
  const kiel = rows.filter((r) => r.teams.includes("kiel-baltic-hurricanes"));
  assert.ok(kiel.length > 0);

  const get = (r: PRow) => (k: string) => rowValue(stat(k), r, meta.availability);
  const a = rows.filter((r) => matches([{ stat: "receivingyards", op: "gte", a: 500 }], "and", get(r)));
  const b = rows.filter((r) => matches([{ stat: "touchdowncatch", op: "gte", a: 5 }], "and", get(r)));
  const and = rows.filter((r) => matches([{ stat: "receivingyards", op: "gte", a: 500 }, { stat: "touchdowncatch", op: "gte", a: 5 }], "and", get(r)));
  const or = rows.filter((r) => matches([{ stat: "receivingyards", op: "gte", a: 500 }, { stat: "touchdowncatch", op: "gte", a: 5 }], "or", get(r)));
  assert.ok(and.length <= Math.min(a.length, b.length));
  assert.equal(or.length, new Set([...a, ...b].map((r) => r.key)).size);

  // UND mit Karrierewert: Saison-Rushing-Yards >= 500 und Karriere-Rushing-Yards >= 1500
  const careerAll = new Map(careerRows(ps, players as never, "all").map((c) => [c.player, c]));
  const val = (r: PRow) => (k: string) => (isCareerKey(k) ? rowValue(stat(baseKey(k)), careerAll.get(r.player)!, meta.availability) : rowValue(stat(k), r, meta.availability));
  const mixed = rows.filter((r) => matches([{ stat: "runyards", op: "gte", a: 500 }, { stat: "k.runyards", op: "gte", a: 1500 }], "and", val(r)));
  assert.ok(mixed.length > 0);
  for (const r of mixed) {
    assert.ok((r.stats.runyards ?? 0) >= 500);
    const total = rows.filter((x) => x.player === r.player).reduce((s, x) => s + (x.stats.runyards ?? 0), 0);
    assert.ok(total >= 1500, `${r.player}: Karriere ${total}`);
  }
  const rushAnd = rows.filter((r) => matches([{ stat: "runyards", op: "gte", a: 500 }, { stat: "touchdownrun", op: "gte", a: 5 }], "and", get(r)));
  assert.ok(rushAnd.length > 0 && rushAnd.every((r) => (r.stats.runyards ?? 0) >= 500 && (r.stats.touchdownrun ?? 0) >= 5));

  // Karriere = Summe der Saisons
  const career = careerRows(ps, players as never, "all");
  const one = career.find((c) => c.seasons.length > 1)!;
  const sum = rows.filter((r) => r.player === one.player).reduce((s, r) => s + (r.stats.receivingyards ?? 0), 0);
  assert.equal(Math.round((one.stats.receivingyards ?? 0) * 100), Math.round(sum * 100));
});

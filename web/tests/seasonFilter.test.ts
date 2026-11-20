// Tests fuer den Saisonfilter der Listen (Standard = aktuelle Saison). Ausfuehren: npm test.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { ALL_SEASONS, seasonOfFilter, seasonSelectValue } from "../src/lib/seasonFilter.ts";

const meta = JSON.parse(fs.readFileSync(new URL("../public/data/meta.json", import.meta.url), "utf8")) as { currentSeason: number; seasons: number[] };

test("Saisonfilter: ohne Auswahl gilt die aktuelle Saison", () => {
  assert.equal(seasonOfFilter("", 2026), 2026);
  assert.equal(seasonOfFilter("2024", 2026), 2024);
  assert.equal(seasonOfFilter(ALL_SEASONS, 2026), null);
  assert.equal(seasonOfFilter("kaputt", 2026), 2026);
});

test("Saisonfilter: alte Links mit ?saison=<aktuell> zeigen die Standardauswahl", () => {
  assert.equal(seasonSelectValue("2026", 2026), "");
  assert.equal(seasonSelectValue("2025", 2026), "2025");
  assert.equal(seasonSelectValue(ALL_SEASONS, 2026), ALL_SEASONS);
});

test("Aktuelle Saison der Daten ist die neueste", () => {
  assert.equal(meta.currentSeason, Math.max(...meta.seasons));
  assert.equal(meta.currentSeason, 2026);
});

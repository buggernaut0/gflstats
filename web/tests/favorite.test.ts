// Tests fuer Lieblingsteam, Navigation und Teamlogos. Ausfuehren: npm test (Node 22.18+).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { favoriteCss, favoriteInitScript, sanitizeTeamId, teamsAttr } from "../src/lib/favorite.ts";
import { NAV, isActive } from "../src/lib/nav.ts";

const teams = JSON.parse(fs.readFileSync(new URL("../public/data/teams.json", import.meta.url), "utf8")) as { id: string; logo: string | null; logoSource?: string | null }[];

test("Team-IDs werden geprueft, fremde Werte aus dem Speicher verworfen", () => {
  assert.equal(sanitizeTeamId("kiel-baltic-hurricanes"), "kiel-baltic-hurricanes");
  assert.equal(sanitizeTeamId('x"]{}body{display:none'), null);
  assert.equal(sanitizeTeamId(""), null);
  assert.equal(sanitizeTeamId(null), null);
});

test("data-teams enthaelt alle Teams des Datensatzes, leer ohne Team", () => {
  assert.deepEqual(teamsAttr(["a-team", "b-team"]), { "data-teams": "a-team b-team" });
  assert.deepEqual(teamsAttr("a-team"), { "data-teams": "a-team" });
  assert.deepEqual(teamsAttr(undefined), {});
  assert.deepEqual(teamsAttr([]), {});
});

test("Hervorhebungs-CSS gilt nur fuer das gewaehlte Team, ungueltige IDs ergeben nichts", () => {
  const css = favoriteCss("kiel-baltic-hurricanes");
  assert.match(css, /\[data-teams~="kiel-baltic-hurricanes"\]:not\(\.fav-plain\)\{background-image/);
  assert.match(css, /tr\[data-teams~="kiel-baltic-hurricanes"\]>:first-child\{box-shadow/);
  assert.match(css, /\.fav-badge\{display:inline-flex\}/);
  assert.equal(favoriteCss('x"]{}body{display:none'), "");
});

test("Startskript erzeugt dieselben Regeln wie favoriteCss", () => {
  const store = new Map([["gfl-favorite-team", "kiel-baltic-hurricanes"]]);
  const style = { textContent: "" };
  const root = { dataset: {} as Record<string, string> };
  const fn = new Function("localStorage", "document", favoriteInitScript);
  fn({ getItem: (k: string) => store.get(k) ?? null }, { documentElement: root, getElementById: () => style });
  assert.equal(style.textContent, favoriteCss("kiel-baltic-hurricanes"));
  assert.equal(root.dataset.favTeam, "kiel-baltic-hurricanes");
  for (const t of teams) assert.ok(favoriteCss(t.id).length > 0, t.id);
});

test("Navigation: Leaders und Rekorde nicht mehr in der Leiste, aber unter Analytics aktiv", () => {
  const labels = NAV.map((n) => n.label);
  assert.ok(!labels.includes("Leaders") && !labels.includes("Rekorde"));
  const analytics = NAV.find((n) => n.href === "/analytics/")!;
  for (const p of ["/analytics", "/analytics/spieler/", "/leaders/", "/rekorde/", "/vergleich/"]) assert.ok(isActive(p, analytics), p);
  const spieler = NAV.find((n) => n.href === "/spieler/")!;
  assert.ok(isActive("/spieler/abc/", spieler));
  assert.ok(!isActive("/spiele/", spieler), "Spieler darf bei /spiele/ nicht aktiv sein");
});

test("Teamlogos: nur vorhandene Dateien verlinkt, jede mit Quelle", () => {
  const withLogo = teams.filter((t) => t.logo);
  assert.ok(withLogo.length > 0);
  for (const t of withLogo) {
    assert.ok(fs.existsSync(new URL(`../public/${t.logo}`, import.meta.url)), `${t.id}: ${t.logo} fehlt`);
    assert.match(t.logoSource ?? "", /^https:\/\//, `${t.id}: Quelle fehlt`);
  }
});

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

test("Startskript erzeugt dieselben Regeln wie favoriteCss, inklusive Teamfarben", () => {
  const colors = { "kiel-baltic-hurricanes": ["#E77F3F", "#11634D"] as [string, string] };
  const run = (fav: string) => {
    const store = new Map([["gfl-favorite-team", fav]]);
    const style = { textContent: "" };
    const root = { dataset: {} as Record<string, string> };
    const win: { __GFL_FAV_COLORS?: unknown } = {};
    const fn = new Function("window", "localStorage", "document", favoriteInitScript(colors));
    fn(win, { getItem: (k: string) => store.get(k) ?? null }, { documentElement: root, getElementById: () => style });
    return { style, root, win };
  };
  const kiel = run("kiel-baltic-hurricanes");
  assert.equal(kiel.style.textContent, favoriteCss("kiel-baltic-hurricanes", colors["kiel-baltic-hurricanes"]));
  assert.match(kiel.style.textContent, /:root\[data-theme="dark"\]\{--fav:#E77F3F/);
  assert.match(kiel.style.textContent, /:root\[data-theme="light"\]\{--fav:#11634D/);
  assert.equal(kiel.root.dataset.favTeam, "kiel-baltic-hurricanes");
  assert.deepEqual(kiel.win.__GFL_FAV_COLORS, colors);
  // Team ohne Farben: nur die Grundregeln (neutrales Violett aus globals.css)
  assert.equal(run("berlin-adler").style.textContent, favoriteCss("berlin-adler"));
  for (const t of teams) assert.ok(favoriteCss(t.id).length > 0, t.id);
});

test("Ungueltige Farben gelangen nicht ins Startskript", () => {
  const script = favoriteInitScript({ "a-team": ["red;}body{display:none", "#000000"], 'x"]': ["#111111", "#222222"] });
  assert.ok(script.startsWith("window.__GFL_FAV_COLORS={};"));
});

test("Simulieren hat einen eigenen Menuepunkt", () => {
  const sim = NAV.find((n) => n.href === "/simulieren/");
  assert.ok(sim && sim.label === "Simulieren");
  assert.deepEqual(NAV.map((n) => n.label), ["Spieler", "Teams", "Spiele", "Analytics", "Trap View", "Simulieren"]);
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

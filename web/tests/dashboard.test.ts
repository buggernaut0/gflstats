// Rechentests fuer die Startseite. Ausfuehren: npm test (Node 22.18+).
// Prueft die Logik mit kleinen Beispieldaten und gleicht echte Werte mit public/data ab.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { leaders, seasonFinal, teamTable, topPerformances } from "../src/lib/dashboard.ts";

const player = (id: string, shared = false) => ({ id, name: id.toUpperCase(), sourceNames: [id], shared, seasons: [], videos: [] });
const season = (p: string, v: number, scope = "all") => ({ player: p, season: 2026, scope, games: 10, teams: ["t1"], stats: { runyards: v } });

test("Rangliste teilt Plaetze bei Gleichstand (1, 2, 2, 4)", () => {
  const players = new Map(["a", "b", "c", "d"].map((x) => [x, player(x)]));
  const rows = leaders([season("a", 100), season("b", 80), season("c", 80), season("d", 50)] as never, players as never, 2026, "all", "runyards");
  assert.deepEqual(rows.map((r) => [r.player, r.rank, r.tied]), [["a", 1, false], ["b", 2, true], ["c", 2, true], ["d", 4, false]]);
});

test("Gemeinsame Eintraege zweier Spieler werden nicht gewertet", () => {
  const players = new Map([["a", player("a")], ["x", player("x", true)]]);
  const rows = leaders([season("a", 10), season("x", 99)] as never, players as never, 2026, "all", "runyards");
  assert.deepEqual(rows.map((r) => r.player), ["a"]);
});

test("Nullwerte erscheinen nicht in der Rangliste", () => {
  const players = new Map([["a", player("a")]]);
  assert.equal(leaders([season("a", 0)] as never, players as never, 2026, "all", "runyards").length, 0);
});

test("Teamtabelle: Siegquote zaehlt Unentschieden halb", () => {
  const ts = [{ team: "t1", season: 2026, scope: "regular", games: 4, wins: 2, losses: 1, ties: 1, pointsFor: 100, pointsAgainst: 60, offense: {}, defenseAllowed: {} }];
  const [r] = teamTable(ts as never, 2026, "regular");
  assert.equal(r.winPct, 0.625);
  assert.equal(r.diff, 40);
  assert.equal(r.ppg, 25);
});

test("Finale = Spiel mit 'Bowl' im Namen", () => {
  const g = (id: string, date: string, name: string, hs: number, as: number) => ({ id, season: 2026, type: "playoff", date, name, home: "h", away: "a", homeScore: hs, awayScore: as, teamStats: {}, statsSource: "statsnscore" });
  const f = seasonFinal([g("1", "2026-10-03", "GFL Bowl", 19, 27), g("2", "2026-10-10", "Relegation", 1, 0)] as never, 2026)!;
  assert.equal(f.winner.team, "a");
  assert.equal(f.winner.score, 27);
});

// ---- Abgleich mit den echten Website-Daten (nur wenn erzeugt)
const DATA = new URL("../public/data/", import.meta.url);
const has = fs.existsSync(new URL("meta.json", DATA));
const load = (f: string) => JSON.parse(fs.readFileSync(new URL(f, DATA), "utf-8"));

test("Leader-Wert = Summe der Spielzeilen dieses Spielers", { skip: !has && "keine Daten erzeugt" }, () => {
  const meta = load("meta.json");
  const s = meta.currentSeason;
  const players = new Map(load("players.json").map((p: { id: string }) => [p.id, p]));
  const [top] = leaders(load("player_seasons.json"), players as never, s, "all", "receivingyards");
  const sum = load(`pg/${s}.json`).filter((r: { p: string }) => r.p === top.player).reduce((a: number, r: { s: Record<string, number> }) => a + (r.s.receivingyards ?? 0), 0);
  assert.equal(top.value, sum);
});

test("Teambilanz = Ergebnisse der Spiele", { skip: !has && "keine Daten erzeugt" }, () => {
  const meta = load("meta.json");
  const games = load("games.json").filter((g: { season: number; type: string }) => g.season === meta.currentSeason && g.type === "regular");
  for (const r of teamTable(load("team_seasons.json"), meta.currentSeason, "regular")) {
    const mine = games.filter((g: { home: string; away: string }) => g.home === r.team || g.away === r.team);
    const wins = mine.filter((g: { home: string; homeScore: number; awayScore: number }) => (g.home === r.team ? g.homeScore > g.awayScore : g.awayScore > g.homeScore)).length;
    assert.equal(r.games, mine.length, r.team);
    assert.equal(r.wins, wins, r.team);
  }
});

test("Beste Einzelleistung ist wirklich das Maximum", { skip: !has && "keine Daten erzeugt" }, () => {
  const meta = load("meta.json");
  const pg = load(`pg/${meta.currentSeason}.json`);
  const games = new Map(load("games.json").map((g: { id: string }) => [g.id, g]));
  const players = new Map(load("players.json").map((p: { id: string }) => [p.id, p]));
  const perf = topPerformances(pg, games as never, players as never, "all").find((p) => p.field === "passingyards")!;
  const max = Math.max(...pg.filter((r: { p: string }) => !(players.get(r.p) as { shared: boolean }).shared).map((r: { s: Record<string, number> }) => r.s.passingyards ?? 0));
  assert.equal(perf.value, max);
});

test("Playoff-Runde nur, wenn der Spielname sie nennt", async () => {
  const { playoffRound } = await import("../src/lib/dashboard.ts");
  assert.equal(playoffRound({ type: "playoff", name: "GFL Bowl 2024" }), "GFL Bowl");
  assert.equal(playoffRound({ type: "playoff", name: "GFL Halbfinale Potsdam vs. Munich" }), "Halbfinale");
  assert.equal(playoffRound({ type: "playoff", name: "Saarland Hurricanes at Dresden Monarchs" }), undefined);
  assert.equal(playoffRound({ type: "regular", name: "GFL Bowl" }), undefined);
});

test("Saison-Highlights: nur Spiele mit Video, Playoffs zuerst, dann knappste Spiele", async () => {
  const { seasonHighlights } = await import("../src/lib/dashboard.ts");
  const g = (id: string, type: string, date: string, hs: number, as: number, video = true) =>
    ({ id, season: 2026, type, date, name: "", home: "a", away: "b", homeScore: hs, awayScore: as, teamStats: {}, statsSource: "statsnscore", ...(video ? { video: { youtubeId: "x".repeat(11), title: "t", channel: null, published: null } } : {}) }) as never;
  const list = [g("r-weit", "regular", "2026-05-01", 40, 7), g("r-knapp", "regular", "2026-05-02", 21, 20), g("po-frueh", "playoff", "2026-09-12", 30, 10), g("po-spaet", "playoff", "2026-10-03", 27, 19), g("ohne", "playoff", "2026-09-19", 1, 0, false)];
  assert.deepEqual(seasonHighlights(list, 2026, 3).map((x: { id: string }) => x.id), ["po-spaet", "po-frueh", "r-knapp"]);
  assert.deepEqual(seasonHighlights(list, 2025), []);
});

test("Echte Daten: jedes Highlight-Video hat eine gueltige YouTube-ID und ist nur einmal vergeben", () => {
  const games = JSON.parse(fs.readFileSync(new URL("../public/data/games.json", import.meta.url), "utf8")) as { id: string; video?: { youtubeId: string } }[];
  const ids = games.filter((x) => x.video).map((x) => x.video!.youtubeId);
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]{11}$/);
});

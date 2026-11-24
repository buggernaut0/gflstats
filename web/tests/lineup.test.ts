// Tests fuer die Starting-Lineup-Logik. Ausfuehren: npm test (Node 22.18+).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { MIN_GAME_SHARE, REGULAR_GAME_SHARE, SLOTS, provisionalLineup, startingLineup, type OlStarter, type TeamOl, type TeamRoster } from "../src/lib/lineup.ts";

const row = (g: number, p: string, s: Record<string, number>, t = "a") => ({ g: `g${g}`, p, t, s });
const roster = (players: [string | null, number, string][]): TeamRoster => ({ source: "test", retrieved: null, note: null, players: players.map(([player, number, position]) => ({ player, name: player ?? "ohne Statistik", number, position: position as never })) });

test("Ohne Kader keine Aufstellung (Positionen werden nicht geraten)", () => {
  assert.equal(startingLineup([row(1, "x", { pass: 30 })], "a", undefined), null);
});

test("Einsatzschwelle: Ein starkes Einzelspiel macht niemanden zum Starter", () => {
  const rows = [
    ...Array.from({ length: 10 }, (_, i) => row(i, "stamm", { pass: 20, passingyards: 150 })),
    row(0, "gast", { pass: 60, passingyards: 500 }), // ein einziges Spiel, aber viel Volumen
  ];
  const l = startingLineup(rows, "a", roster([["stamm", 12, "QB"], ["gast", 7, "QB"]]))!;
  assert.equal(l.minGames, Math.ceil(10 * MIN_GAME_SHARE));
  assert.equal(l.offense.find((x) => x.slot === "QB1")!.player, "stamm");
  assert.match(l.next.QB!.reason, /nur 1 von 10 Spielen/);
});

test("Mindestvolumen: Randspieler nur ueber das Auffuellen aus dem Kader, nie vor Spielern mit Volumen", () => {
  // wr-b: ueber der Einsatzschwelle (5 von 10), aber weder Volumen noch regelmaessig genug fuer die Kulanzregel
  const rows = Array.from({ length: 10 }, (_, i) => [row(i, "wr-a", { catched: 5, receivingyards: 80 }), ...(i < 5 ? [row(i, "wr-b", { catched: 1, receivingyards: 3 })] : [])]).flat();
  const l = startingLineup(rows, "a", roster([["wr-a", 80, "WR"], ["wr-b", 81, "WR"]]))!;
  const wr = l.offense.filter((x) => x.position === "WR");
  // wr-b fuellt WR2 aus dem Kader (Kriterien nicht erfuellt); WR3 bleibt leer, weil der Kader keinen dritten WR fuehrt
  assert.deepEqual(wr.map((x) => x.player), ["wr-a", "wr-b", null]);
  assert.deepEqual(wr.map((x) => x.fill), [undefined, "stats", undefined]);
  assert.deepEqual(wr.map((x) => x.slot), ["WR1", "WR2", "WR3"]);
  assert.equal(wr[0].number, 80);
  assert.equal(wr[1].number, 81);
});

test("Kulanzregel: Stammkraft unter dem Mindestvolumen fuellt einen freien Platz, aber nie vor Spielern mit Volumen", () => {
  assert.ok(REGULAR_GAME_SHARE > MIN_GAME_SHARE);
  const rows = Array.from({ length: 10 }, (_, i) => [
    row(i, "rb-stamm", { run: 1, runyards: 9 }), // 10 Spiele, nur 10 Laeufe - aber hoechste Yards-Zahl waere egal
    ...(i < 5 ? [row(i, "rb-volumen", { run: 8, runyards: 1 })] : []), // 5 Spiele, 40 Laeufe
    ...(i < 5 ? [row(i, "rb-rand", { run: 1, runyards: 30 })] : []), // 5 Spiele, 5 Laeufe: weder Volumen noch Stammkraft
  ]).flat();
  const l = startingLineup(rows, "a", roster([["rb-stamm", 20, "RB"], ["rb-volumen", 21, "RB"], ["rb-rand", 22, "RB"]]))!;
  assert.deepEqual(l.offense.filter((x) => x.position === "RB").map((x) => x.player), ["rb-volumen", "rb-stamm"]);
  assert.ok(l.offense.filter((x) => x.position === "RB").every((x) => !x.fill));
  assert.equal(l.next.RB!.player, "rb-rand");
});

test("Nur Spieler der Positionsgruppe laut Kader; Spiele anderer Teams zaehlen nicht", () => {
  const rows = [
    ...Array.from({ length: 5 }, (_, i) => row(i, "rb", { run: 15, runyards: 70 })),
    ...Array.from({ length: 5 }, (_, i) => row(i, "db", { run: 20, runyards: 200, tackletotal: 4 })), // DB mit Laeufen wird kein RB
    ...Array.from({ length: 9 }, (_, i) => row(i + 20, "rb", { run: 30 }, "b")),
  ];
  const l = startingLineup(rows, "a", roster([["rb", 22, "RB"], ["db", 21, "DB"]]))!;
  assert.equal(l.teamGames, 5);
  assert.deepEqual(l.offense.filter((x) => x.position === "RB").map((x) => x.player), ["rb"]); // leerer RB2 entfaellt: elf Plaetze
  assert.equal(l.offense.find((x) => x.slot === "RB1")!.score, 75);
  assert.equal(l.defense.find((x) => x.slot === "DB1")!.player, "db");
});

test("Offensive Line: ohne Starterliste bleiben alle fuenf Plaetze offen - nie aus dem Kader aufgefuellt", () => {
  const rows = [
    ...Array.from({ length: 10 }, (_, i) => row(i, "qb", { pass: 20 })),
    ...Array.from({ length: 6 }, (_, i) => row(i, "ol-a", { tackletotal: 1 })),
    row(0, "ol-b", { penalty: 1 }),
  ];
  const l = startingLineup(rows, "a", roster([["qb", 1, "QB"], ["ol-a", 70, "OL"], ["ol-b", 71, "OL"], [null, 72, "OL"], [null, 73, "OL"], [null, 74, "OL"]]))!;
  const ol = l.offense.filter((x) => x.position === "OL");
  assert.equal(ol.length, 5);
  // Einsaetze im Statistikbogen oder Kaderreihenfolge machen niemanden zum Starter
  assert.deepEqual(ol.map((x) => x.player ?? x.rosterName), [null, null, null, null, null]);
  assert.equal(l.olSource, null);
});

const olList = (line: Partial<OlStarter>[]): TeamOl => ({
  game: "g9", date: "2026-09-12", gametype: "Playoff", opponent: "b", url: "https://statsnscore.online/stats/v2/gamedata?gameid=g9", teamGames: 10, listedGames: 8,
  line: line.map((e, i) => ({ number: 70 + i, name: `OL ${i}`, player: null, role: null, slot: null, starts: 8, playoffStarts: 1, confidence: "hoch", ...e })),
});

test("Offensive Line: die fuenf Starter laut Starterliste, auch ohne Spieler-ID (Name und Nummer)", () => {
  const rows = [...Array.from({ length: 10 }, (_, i) => row(i, "qb", { pass: 20 })), row(0, "ol-a", { tackletotal: 1 })];
  const l = startingLineup(rows, "a", roster([["qb", 1, "QB"], ["ol-a", 70, "OL"]]), new Set(), olList([{ player: "ol-a", name: "A" }, {}, {}, {}, { confidence: "mittel", starts: 2 }]))!;
  const ol = l.offense.filter((x) => x.position === "OL");
  assert.deepEqual(ol.map((x) => x.number), [70, 71, 72, 73, 74]);
  assert.equal(ol[0].player, "ol-a");
  assert.equal(ol[0].games, 1);
  assert.deepEqual(ol.map((x) => x.player === null), [false, true, true, true, true]);
  assert.ok(ol.every((x) => x.rosterName && !x.fill));
  assert.equal(ol[4].ol!.confidence, "mittel");
  assert.equal(ol[4].ol!.listedGames, 8);
  assert.equal(l.olSource!.game, "g9");
});

test("Offensive Line: Center in die Mitte, Tackles aussen, belegter Slot hat Vorrang - ohne Angabe keine Seite", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row(i, "qb", { pass: 20 }));
  const l = startingLineup(rows, "a", roster([["qb", 1, "QB"]]), new Set(), olList(([{ role: "T" }, { role: "G" }, { role: "C" }, { role: "G" }, { role: "T" }] as Partial<OlStarter>[]).reverse()))!;
  const ol = l.offense.filter((x) => x.position === "OL").sort((a, b) => a.spot[1] - b.spot[1]);
  assert.deepEqual(ol.map((x) => x.slot), ["OT", "OG", "C", "OG", "OT"]);
  const s = startingLineup(rows, "a", roster([["qb", 1, "QB"]]), new Set(), olList([{ slot: "RT", slotSource: "x" }, { role: "C" }, {}, {}, {}]))!;
  const sl = s.offense.filter((x) => x.position === "OL").sort((a, b) => a.spot[1] - b.spot[1]);
  assert.equal(sl[4].slot, "RT");
  assert.equal(sl[4].number, 70);
  assert.equal(sl[2].slot, "C");
  assert.deepEqual(sl.map((x) => x.slot).filter((x) => x === "OL").length, 3);
});

test("Vorlaeufige Aufstellung (ohne Kader): OL ebenfalls aus der Starterliste", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row(i, "qb", { pass: 80 }));
  const l = provisionalLineup(rows, "a", () => "QB", new Set(), olList([{}, {}, {}, {}, {}]))!;
  assert.deepEqual(l.offense.filter((x) => x.position === "OL").map((x) => x.number), [70, 71, 72, 73, 74]);
});

test("Elfter Offense-Platz: RB2 oder WR3 nach Statistik, nie beide", () => {
  const base = (rb2: Record<string, number>, wr3: Record<string, number>) =>
    Array.from({ length: 10 }, (_, i) => [
      row(i, "rb1", { run: 15, runyards: 80 }), row(i, "rb2", rb2),
      row(i, "wr1", { catched: 5, receivingyards: 90 }), row(i, "wr2", { catched: 4, receivingyards: 60 }), row(i, "wr3", wr3),
    ]).flat();
  const r = roster([["rb1", 20, "RB"], ["rb2", 21, "RB"], ["wr1", 80, "WR"], ["wr2", 81, "WR"], ["wr3", 82, "WR"]]);
  const slots = (l: ReturnType<typeof startingLineup>) => l!.offense.filter((x) => x.player).map((x) => x.slot).join(",");
  // mehr Yards from Scrimmage beim Running Back
  let l = startingLineup(base({ run: 8, runyards: 45, catched: 1, receivingyards: 10 }, { catched: 3, receivingyards: 40 }), "a", r)!;
  assert.equal(slots(l), "RB1,RB2,WR1,WR2");
  assert.equal(l.flex.winner, "RB2");
  assert.equal(l.next.WR!.player, "wr3");
  assert.deepEqual(l.offense.find((x) => x.slot === "RB1")!.spot, ["RB", 0]);
  // mehr Yards beim Receiver: ein Running Back, versetzt neben dem QB
  l = startingLineup(base({ run: 5, runyards: 20 }, { catched: 3, receivingyards: 40 }), "a", r)!;
  assert.equal(slots(l), "RB1,WR1,WR2,WR3");
  assert.equal(l.next.RB!.player, "rb2");
  assert.deepEqual(l.offense.find((x) => x.slot === "RB1")!.spot, ["RB", 0]);
  // Mindestvolumen schlaegt Kulanz: RB2 mit vielen Yards, aber nur 20 Ballkontakte, gegen WR3 mit Volumen
  l = startingLineup(base({ run: 2, runyards: 60 }, { catched: 2, receivingyards: 15 }), "a", r)!;
  assert.equal(l.flex.winner, "WR3");
  assert.equal(l.offense.length, 11);
});

test("Vorlaeufige Aufstellung ohne Kader: nur abgeleitete Rollen, keine Nummern, OL frei, Defense nach Profil geordnet", () => {
  const rows = Array.from({ length: 10 }, (_, i) => [
    row(i, "qb", { pass: 25 }),
    row(i, "rec", { catched: 4, receivingyards: 50 }),
    row(i, "rusher", { tackletotal: 3, sacktotal: 1, tackleforloss: 1 }),
    row(i, "cover", { tackletotal: 3, intercepted: 0.5, brokenuppass: 1 }),
    row(i, "tackler", { tackletotal: 6 }),
    row(i, "ohne-rolle", { tackletotal: 9 }),
  ]).flat();
  const roles: Record<string, string | null> = { qb: "QB", rec: "WR/TE", rusher: "DEF", cover: "DEF", tackler: "DEF", "ohne-rolle": null };
  const l = provisionalLineup(rows, "a", (id) => roles[id])!;
  assert.equal(l.basis, "provisional");
  const all = [...l.offense, ...l.defense];
  assert.equal(l.offense.length, 11);
  assert.equal(l.defense.length, 11);
  assert.ok(all.every((x) => x.number === null));
  assert.deepEqual(l.offense.filter((x) => x.position === "OL").map((x) => x.player), [null, null, null, null, null]);
  assert.deepEqual(l.offense.filter((x) => x.position === "REC").map((x) => [x.slot, x.player]), [["REC1", "rec"], ["REC2", null], ["REC3", null], ["REC4", null]]);
  const def = l.defense.filter((x) => x.player);
  assert.deepEqual(def.map((x) => x.player), ["rusher", "tackler", "cover"]); // vorn nach hinten, ohne abgeleitete Rolle nie dabei
  assert.ok(l.defense.every((x) => x.slot === "DEF"));
  assert.deepEqual(l.defense.map((x) => x.spot[0]).join(""), "DLDLDLDLLBLBLBDBDBDBDB");
  assert.equal(provisionalLineup([], "a", () => "QB"), null);
});

const data = (f: string) => new URL(`../public/data/${f}`, import.meta.url);
test("Echte Daten Ravensburg 2026: jeder Starter steht im Kader, erfuellt die Schwelle und ist eindeutig", { skip: !fs.existsSync(data("rosters.json")) && "keine Daten erzeugt" }, () => {
  const rosters = JSON.parse(fs.readFileSync(data("rosters.json"), "utf8"));
  const rows = JSON.parse(fs.readFileSync(data("pg/2026.json"), "utf8"));
  const r: TeamRoster = rosters["2026"]["ravensburg-razorbacks"];
  const ol: TeamOl = JSON.parse(fs.readFileSync(data("ol_starters.json"), "utf8"))["2026"]["ravensburg-razorbacks"];
  const l = startingLineup(rows, "ravensburg-razorbacks", r, new Set(), ol)!;
  const all = [...l.offense, ...l.defense];
  assert.equal(all.length, SLOTS.reduce((n, s) => n + s.count, 0) - 1); // elfter Offense-Platz: RB2 oder WR3
  assert.equal(l.offense.length, 11);
  assert.equal(l.defense.length, 11);
  assert.ok(["RB2", "WR3"].includes(l.flex.winner));
  assert.ok(all.every((x) => x.rosterName), "jeder Platz besetzt");
  assert.equal(new Set(all.map((x) => x.rosterName)).size, all.length, "kein Spieler doppelt");
  for (const x of all) {
    const e = r.players.find((p) => p.name === x.rosterName && p.number === x.number)!;
    assert.ok(e, `${x.rosterName} steht im Kader`);
    assert.equal(e.position, x.position);
    assert.equal(e.player, x.player);
    // regulaer ermittelt: Einsatzschwelle (Offensive Line: Starterliste der Liga, siehe unten)
    if (!x.fill && x.position !== "OL") assert.ok(x.games >= l.minGames, `${x.player}: ${x.games} Spiele`);
  }
  // Offensive Line laut Starterliste des Playoff-Spiels vom 12.09.2026 (Hinweis eines Spielers: bisher falsch)
  const line = l.offense.filter((x) => x.position === "OL").map((x) => x.number).sort();
  assert.deepEqual(line, [54, 69, 72, 75, 78]);
  assert.ok(!line.includes(55), "Schafheutle (#55) startete laut Starterlisten kein Spiel");
  assert.equal(l.offense.find((x) => x.slot === "QB1")!.player, "broghean-mcgovern");
});

test("Echte Daten 2026: alle Kader-Teams – Nummern/Positionen aus dem Kader, OL mit Namen, keiner doppelt", { skip: !fs.existsSync(data("rosters.json")) && "keine Daten erzeugt" }, () => {
  const rosters = JSON.parse(fs.readFileSync(data("rosters.json"), "utf8"))["2026"] as Record<string, TeamRoster>;
  const rows = JSON.parse(fs.readFileSync(data("pg/2026.json"), "utf8"));
  assert.ok(Object.keys(rosters).length >= 14);
  const ols = JSON.parse(fs.readFileSync(data("ol_starters.json"), "utf8"))["2026"] as Record<string, TeamOl>;
  for (const [team, r] of Object.entries(rosters)) {
    const l = startingLineup(rows, team, r, new Set(), ols[team])!;
    const all = [...l.offense, ...l.defense];
    assert.equal(l.offense.length, 11);
    assert.equal(l.defense.length, 11);
    // jeder Platz besetzt - auch O-Line und D-Line -, keiner doppelt, Position und Nummer laut Kader
    assert.deepEqual(all.filter((x) => !x.rosterName).map((x) => x.slot), [], `${team}: freie Plaetze`);
    assert.equal(new Set(all.map((x) => `${x.rosterName}#${x.number}`)).size, all.length, `${team}: kein Spieler doppelt`);
    for (const x of all) {
      const e = r.players.find((p) => p.name === x.rosterName && p.number === x.number)!;
      assert.ok(e, `${team}: ${x.rosterName} steht im Kader`);
      assert.equal(e.position, x.position, `${team}: ${x.rosterName}`);
      assert.equal(e.player, x.player);
      // nur wenn der Kader gar keinen Tight End fuehrt, steht ein Wide Receiver auf dem TE-Platz
      if (x.spot[0] !== x.position) assert.ok(x.spot[0] === "TE" && x.position === "WR" && !r.players.some((p) => p.position === "TE"), `${team}: ${x.slot}`);
    }
  }
});

test("Kader ohne Tight End: der TE-Platz geht an einen weiteren Wide Receiver, nie an eine andere Gruppe", () => {
  const rows = Array.from({ length: 4 }, (_, i) => [row(i, "wr-a", { catched: 5, receivingyards: 80 }), row(i, "ol", { tackletotal: 1 })]).flat();
  const l = startingLineup(rows, "a", roster([["wr-a", 80, "WR"], [null, 81, "WR"], [null, 82, "WR"], [null, 83, "WR"], ["ol", 70, "OL"]]))!;
  const te = l.offense.find((x) => x.spot[0] === "TE")!;
  assert.equal(te.position, "WR");
  assert.equal(te.slot, "WR4");
  assert.equal(te.number, 83);
  assert.equal(te.fill, "roster");
  assert.equal(new Set(l.offense.filter((x) => x.rosterName).map((x) => x.number)).size, l.offense.filter((x) => x.rosterName).length);
});

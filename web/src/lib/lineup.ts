/**
 * Starting Lineup je Team und Saison, automatisch aus den Statistikboegen ermittelt.
 *
 * Datenlage: Die Quelle kennt keine Snaps, keine Starter-Angaben und keine Positionen. Verwendet werden
 *   1. die Spielzeilen des Teams in der Saison (Einsaetze = Spiele mit Eintrag im Statistikbogen, Statistikwerte),
 *   2. der offizielle Kader (curation/rosters.json): Positionsgruppe und Rueckennummer.
 * Ohne Kader gibt es keine Aufstellung - Positionen werden nicht geraten.
 *
 * Auswahl je Positionsgruppe (siehe SLOTS):
 *   - Nur Spieler der Gruppe laut Kader.
 *   - Einsatzschwelle: mindestens MIN_GAME_SHARE der Teamspiele (aufgerundet). Wer nur vereinzelt
 *     auftaucht, wird nie Starter - egal wie gut ein einzelnes Spiel war.
 *   - Mindestvolumen je Gruppe (z. B. Passversuche beim QB), damit etwa ein Receiver mit zwei Catches
 *     keinen Platz besetzt. Kulanzregel: Wer in mindestens REGULAR_GAME_SHARE der Teamspiele eingesetzt
 *     wurde, gilt als fester Bestandteil und darf einen freien Platz auch unter dem Mindestvolumen
 *     besetzen - er steht in der Rangfolge aber immer hinter den Spielern, die das Volumen erreichen.
 *   - Rangfolge nach einer Produktionszahl der Gruppe (score), bei Gleichstand mehr Einsaetze.
 *   - Offensive Line: Es gibt keine Leistungswerte. Einziger Beleg sind Einsaetze im Statistikbogen
 *     (Linemen stehen dort nur mit Tackles nach Ballverlust, Fumble-Recoveries oder Strafen). Wer die
 *     Einsatzschwelle nicht belegt, bleibt weg; der Platz ist dann unbesetzt (player = null).
 *   - Plaetze, fuer die niemand die Kriterien erfuellt, bleiben leer statt mit Randspielern gefuellt.
 *
 * Grundformation: elf Offense-Plaetze (1 QB, 1 RB, 2 WR, 1 TE, 5 OL und ein elfter Platz, der nach Statistik
 * an den zweiten RB oder den dritten WR geht - siehe applyFlex) und elf Defense-Plaetze (4 DL, 3 LB, 4 DB).
 * Das ist eine Darstellung, keine Aussage ueber das tatsaechliche Spielsystem des Teams.
 */
import type { PlayerGame, Stats } from "./types.ts";

export type RosterPosition = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "K" | "P";
/** Gruppen der vorlaeufigen Aufstellung (ohne Kader): Receiver und Defense lassen sich aus Statistik nicht feiner trennen */
export type LineupPosition = RosterPosition | "REC" | "DEF";

export interface RosterEntry {
  player: string | null;
  name: string;
  number: number;
  position: RosterPosition;
}

export interface TeamRoster {
  source: string;
  retrieved: string | null;
  note: string | null;
  players: RosterEntry[];
}

export const MIN_GAME_SHARE = 0.4;
export const REGULAR_GAME_SHARE = 0.6;

const v = (s: Stats, k: string) => s[k] ?? 0;

interface SlotDef {
  position: RosterPosition;
  unit: "offense" | "defense";
  count: number;
  /** Beschreibung der Rangfolge fuer die Methodik */
  basis: string;
  score: (s: Stats) => number;
  /** Mindestvolumen ueber die Saison (0 = nur Einsatzschwelle) */
  min: (s: Stats) => boolean;
  minLabel: string;
  /** zwei Kennzahlen fuer die Anzeige */
  show: [string, string];
}

export const SLOTS: SlotDef[] = [
  { position: "QB", unit: "offense", count: 1, basis: "Passversuche", score: (s) => v(s, "pass"), min: (s) => v(s, "pass") >= 50, minLabel: "mind. 50 Passversuche", show: ["passingyards", "touchdownpass"] },
  { position: "RB", unit: "offense", count: 2, basis: "Ballkontakte (Carries + Receptions)", score: (s) => v(s, "run") + v(s, "catched"), min: (s) => v(s, "run") + v(s, "catched") >= 25, minLabel: "mind. 25 Ballkontakte", show: ["runyards", "touchdownrun"] },
  { position: "WR", unit: "offense", count: 3, basis: "Receiving Yards", score: (s) => v(s, "receivingyards"), min: (s) => v(s, "catched") >= 10, minLabel: "mind. 10 Receptions", show: ["receivingyards", "catched"] },
  { position: "TE", unit: "offense", count: 1, basis: "Receiving Yards", score: (s) => v(s, "receivingyards"), min: (s) => v(s, "catched") >= 5, minLabel: "mind. 5 Receptions", show: ["receivingyards", "catched"] },
  { position: "OL", unit: "offense", count: 5, basis: "Einsätze im Statistikbogen (keine Leistungswerte vorhanden)", score: () => 0, min: () => true, minLabel: "nur Einsatzschwelle", show: ["tackletotal", "fumblerecovered"] },
  { position: "DL", unit: "defense", count: 4, basis: "Tackles + 2 × Sacks + Tackles for Loss", score: (s) => v(s, "tackletotal") + 2 * v(s, "sacktotal") + v(s, "tackleforloss"), min: (s) => v(s, "tackletotal") >= 8, minLabel: "mind. 8 Tackles", show: ["tackletotal", "sacktotal"] },
  { position: "LB", unit: "defense", count: 3, basis: "Tackles + Tackles for Loss + Sacks", score: (s) => v(s, "tackletotal") + v(s, "tackleforloss") + v(s, "sacktotal"), min: (s) => v(s, "tackletotal") >= 8, minLabel: "mind. 8 Tackles", show: ["tackletotal", "tackleforloss"] },
  { position: "DB", unit: "defense", count: 4, basis: "Tackles + 3 × Interceptions + 1,5 × abgewehrte Pässe", score: (s) => v(s, "tackletotal") + 3 * v(s, "intercepted") + 1.5 * v(s, "brokenuppass"), min: (s) => v(s, "tackletotal") >= 8, minLabel: "mind. 8 Tackles", show: ["tackletotal", "intercepted"] },
];

export interface LineupPlayer {
  /** z. B. "WR1" */
  slot: string;
  position: LineupPosition;
  /** Platz in der schematischen Formation: Gruppe und Index in FORMATION */
  spot: [RosterPosition, number];
  /** null = Platz unbesetzt (niemand erfuellt die Kriterien) */
  player: string | null;
  rosterName: string | null;
  number: number | null;
  games: number;
  score: number;
  stats: Stats;
  /** true = Mindestvolumen der Gruppe erreicht; false = nur ueber die Kulanzregel (Stammkraft) */
  volume?: boolean;
}

export interface Lineup {
  /** "roster" = Positionen und Nummern aus dem offiziellen Kader; "provisional" = nur aus Statistik abgeleitet */
  basis: "roster" | "provisional";
  teamGames: number;
  minGames: number;
  offense: LineupPlayer[];
  defense: LineupPlayer[];
  /** Elfter Offense-Platz: zweiter Running Back oder dritter Receiver, nach Statistik entschieden */
  flex: { winner: string; loser: string | null; reason: string };
  /** je Gruppe der naechste nicht beruecksichtigte Spieler, zur Kontrolle der Auswahl */
  next: Record<string, { player: string; games: number; score: number; reason: string } | null>;
}

/**
 * @param rows Spielzeilen der Saison (alle Teams oder schon gefiltert)
 * @param maxFields Felder, die als Maximum statt Summe zaehlen ("Laengster ...")
 */
export function startingLineup(rows: PlayerGame[], team: string, roster: TeamRoster | undefined, maxFields: Set<string> = new Set()): Lineup | null {
  if (!roster) return null;
  const mine = rows.filter((r) => r.t === team);
  const teamGames = new Set(mine.map((r) => r.g)).size;
  if (!teamGames) return null;
  const minGames = Math.ceil(teamGames * MIN_GAME_SHARE);

  const agg = new Map<string, { games: number; stats: Stats }>();
  for (const r of mine) {
    const e = agg.get(r.p) ?? { games: 0, stats: {} };
    e.games += 1;
    for (const [k, x] of Object.entries(r.s)) e.stats[k] = maxFields.has(k) ? Math.max(e.stats[k] ?? 0, x) : Math.round(((e.stats[k] ?? 0) + x) * 100) / 100;
    agg.set(r.p, e);
  }

  const out: Lineup = { basis: "roster", teamGames, minGames, offense: [], defense: [], flex: { winner: "", loser: null, reason: "" }, next: {} };
  for (const def of SLOTS) {
    const candidates = roster.players
      .filter((e) => e.position === def.position && e.player && agg.has(e.player))
      .map((e) => ({ entry: e, ...agg.get(e.player!)!, score: Math.round(def.score(agg.get(e.player!)!.stats) * 100) / 100 }))
      .sort((a, b) => b.score - a.score || b.games - a.games || a.entry.name.localeCompare(b.entry.name));
    const regularGames = Math.ceil(teamGames * REGULAR_GAME_SHARE);
    const eligible = [
      ...candidates.filter((c) => c.games >= minGames && def.min(c.stats)),
      ...candidates.filter((c) => c.games >= regularGames && !def.min(c.stats) && def.position !== "OL"),
    ];
    const single = def.count === 1;
    for (let i = 0; i < def.count; i++) {
      const c = eligible[i];
      const slot = def.position === "OL" ? "OL" : `${def.position}${single ? "1" : i + 1}`;
      out[def.unit].push(
        c
          ? { slot, position: def.position, spot: [def.position, i], player: c.entry.player, rosterName: c.entry.name, number: c.entry.number, games: c.games, score: c.score, stats: c.stats, volume: def.min(c.stats) }
          : { slot, position: def.position, spot: [def.position, i], player: null, rosterName: null, number: null, games: 0, score: 0, stats: {} },
      );
    }
    const rest = candidates.filter((c) => !eligible.slice(0, def.count).includes(c))[0];
    out.next[def.position] = rest
      ? { player: rest.entry.player!, games: rest.games, score: rest.score, reason: rest.games < minGames ? `nur ${rest.games} von ${teamGames} Spielen` : !def.min(rest.stats) ? `Mindestvolumen nicht erreicht (${def.minLabel}) und weniger als ${regularGames} Spiele` : "Platz bereits besetzt" }
      : null;
  }
  applyFlex(out, "RB2", "WR3");
  return out;
}

const scrimmage = (s: Stats) => v(s, "runyards") + v(s, "receivingyards");

/**
 * Elf statt zwoelf Offense-Spieler: Neben QB, RB1, zwei Receivern, TE (bzw. drittem Receiver) und fuenf Linemen
 * bleibt ein Platz, der je nach Team an den zweiten Running Back oder den weiteren Receiver geht. Entschieden wird
 * nach Statistik: Ein Spieler, der das Mindestvolumen seiner Gruppe erreicht, schlaegt einen, der nur ueber die
 * Kulanzregel dabei waere; sonst zaehlen die Yards from Scrimmage (Rushing + Receiving). Bei Gleichstand und wenn
 * beide Plaetze leer sind, bleibt es bei der ueblichen Formation mit einem Running Back.
 */
function applyFlex(out: Lineup, rbSlot: string, recSlot: string) {
  const rb = out.offense.find((x) => x.slot === rbSlot)!;
  const rec = out.offense.find((x) => x.slot === recSlot)!;
  let keepRb = false;
  let reason: string;
  if (!rb.player) reason = rec.player ? "kein zweiter Running Back erfüllt die Kriterien" : "weder ein zweiter Running Back noch ein weiterer Receiver erfüllt die Kriterien";
  else if (!rec.player) {
    keepRb = true;
    reason = "kein weiterer Receiver erfüllt die Kriterien";
  } else if (!!rb.volume !== !!rec.volume) {
    keepRb = !!rb.volume;
    reason = "nur einer der beiden erreicht das Mindestvolumen seiner Gruppe";
  } else {
    keepRb = scrimmage(rb.stats) > scrimmage(rec.stats);
    reason = `Yards from Scrimmage: ${Math.round(scrimmage(rb.stats))} (${rbSlot}) gegen ${Math.round(scrimmage(rec.stats))} (${recSlot})`;
  }
  const drop = keepRb ? rec : rb;
  out.flex = { winner: keepRb ? rbSlot : recSlot, loser: drop.player, reason };
  out.offense = out.offense.filter((x) => x !== drop);
  if (drop.player) out.next[drop.position] = { player: drop.player, games: drop.games, score: drop.score, reason: `elfter Platz ging an ${out.flex.winner} (${reason})` };
}

/** Gruppen der vorlaeufigen Aufstellung. Receiver: WR und TE gemeinsam; Defense: alle elf Plaetze gemeinsam. */
export const PROVISIONAL_SLOTS: { position: LineupPosition; unit: "offense" | "defense"; count: number; basis: string; minLabel: string; show: [string, string] }[] = [
  { position: "QB", unit: "offense", count: 1, basis: SLOTS[0].basis, minLabel: SLOTS[0].minLabel, show: SLOTS[0].show },
  { position: "RB", unit: "offense", count: 2, basis: SLOTS[1].basis, minLabel: SLOTS[1].minLabel, show: SLOTS[1].show },
  { position: "REC", unit: "offense", count: 4, basis: "Receiving Yards (WR und TE gemeinsam)", minLabel: "mind. 10 Receptions", show: ["receivingyards", "catched"] },
  { position: "OL", unit: "offense", count: 5, basis: "ohne Kader nicht belegbar", minLabel: "bleibt frei", show: ["tackletotal", "fumblerecovered"] },
  { position: "DEF", unit: "defense", count: 11, basis: "Tackles + 2 × Sacks + Tackles for Loss + 3 × Interceptions + 1,5 × abgewehrte Pässe", minLabel: "mind. 8 Tackles", show: ["tackletotal", "sacktotal"] },
];

const REC_SPOTS: [RosterPosition, number][] = [["WR", 0], ["WR", 1], ["TE", 0], ["WR", 2]];
const DEF_SPOTS: [RosterPosition, number][] = [["DL", 0], ["DL", 1], ["DL", 2], ["DL", 3], ["LB", 0], ["LB", 1], ["LB", 2], ["DB", 0], ["DB", 1], ["DB", 2], ["DB", 3]];

/**
 * Vorlaeufige Aufstellung fuer Teams ohne hinterlegten Kader. Grundlage ist nur die aus der Statistik
 * abgeleitete Rolle (QB, RB, WR/TE, DEF) - es gibt also keine Rueckennummern, keine Trennung WR/TE und
 * keine Trennung DL/LB/DB. Einsatzschwelle, Mindestvolumen und Kulanzregel wie bei startingLineup.
 * Defense: die elf produktivsten Verteidiger; auf dem Feld stehen sie nach Statistikprofil (viele Sacks und
 * Tackles for Loss vorn, viele Interceptions und abgewehrte Paesse hinten). Das ist eine Anordnung fuer die
 * Darstellung, keine Positionsangabe - der Platz heisst deshalb fuer alle nur "DEF".
 * Offensive Line: ohne Kader nicht belegbar, bleibt frei.
 */
export function provisionalLineup(rows: PlayerGame[], team: string, roleOf: (player: string) => string | null | undefined, maxFields: Set<string> = new Set()): Lineup | null {
  const mine = rows.filter((r) => r.t === team);
  const teamGames = new Set(mine.map((r) => r.g)).size;
  if (!teamGames) return null;
  const minGames = Math.ceil(teamGames * MIN_GAME_SHARE);
  const regularGames = Math.ceil(teamGames * REGULAR_GAME_SHARE);
  const agg = new Map<string, { games: number; stats: Stats }>();
  for (const r of mine) {
    const e = agg.get(r.p) ?? { games: 0, stats: {} };
    e.games += 1;
    for (const [k, x] of Object.entries(r.s)) e.stats[k] = maxFields.has(k) ? Math.max(e.stats[k] ?? 0, x) : Math.round(((e.stats[k] ?? 0) + x) * 100) / 100;
    agg.set(r.p, e);
  }
  const front = (s: Stats) => 2 * v(s, "sacktotal") + v(s, "tackleforloss");
  const back = (s: Stats) => 3 * v(s, "intercepted") + 1.5 * v(s, "brokenuppass");
  const groups: { position: LineupPosition; role: string; count: number; unit: "offense" | "defense"; score: (s: Stats) => number; min: (s: Stats) => boolean; spots: [RosterPosition, number][] }[] = [
    { position: "QB", role: "QB", count: 1, unit: "offense", score: SLOTS[0].score, min: SLOTS[0].min, spots: [["QB", 0]] },
    { position: "RB", role: "RB", count: 2, unit: "offense", score: SLOTS[1].score, min: SLOTS[1].min, spots: [["RB", 0], ["RB", 1]] },
    { position: "REC", role: "WR/TE", count: 4, unit: "offense", score: (s) => v(s, "receivingyards"), min: (s) => v(s, "catched") >= 10, spots: REC_SPOTS },
    { position: "DEF", role: "DEF", count: 11, unit: "defense", score: (s) => v(s, "tackletotal") + front(s) + back(s), min: (s) => v(s, "tackletotal") >= 8, spots: DEF_SPOTS },
  ];
  const out: Lineup = { basis: "provisional", teamGames, minGames, offense: [], defense: [], flex: { winner: "", loser: null, reason: "" }, next: {} };
  const empty = (slot: string, position: LineupPosition, spot: [RosterPosition, number]): LineupPlayer => ({ slot, position, spot, player: null, rosterName: null, number: null, games: 0, score: 0, stats: {} });
  for (const g of groups) {
    const candidates = [...agg.entries()]
      .filter(([id]) => roleOf(id) === g.role)
      .map(([id, e]) => ({ id, ...e, score: Math.round(g.score(e.stats) * 100) / 100 }))
      .sort((a, b) => b.score - a.score || b.games - a.games || a.id.localeCompare(b.id));
    let chosen = [...candidates.filter((c) => c.games >= minGames && g.min(c.stats)), ...candidates.filter((c) => c.games >= regularGames && !g.min(c.stats))].slice(0, g.count);
    const rest = candidates.find((c) => !chosen.includes(c));
    out.next[g.position] = rest ? { player: rest.id, games: rest.games, score: rest.score, reason: rest.games < minGames ? `nur ${rest.games} von ${teamGames} Spielen` : !g.min(rest.stats) ? "Mindestvolumen nicht erreicht" : "Platz bereits besetzt" } : null;
    // Defense: Anordnung nach Statistikprofil, vorn nach hinten
    if (g.position === "DEF") chosen = [...chosen].sort((a, b) => front(b.stats) - back(b.stats) - (front(a.stats) - back(a.stats)) || b.score - a.score);
    for (let i = 0; i < g.count; i++) {
      const c = chosen[i];
      const slot = g.position === "DEF" ? "DEF" : `${g.position}${g.count === 1 ? "1" : i + 1}`;
      out[g.unit].push(c ? { slot, position: g.position, spot: g.spots[i], player: c.id, rosterName: null, number: null, games: c.games, score: c.score, stats: c.stats, volume: g.min(c.stats) } : empty(slot, g.position, g.spots[i]));
    }
    if (g.position === "REC") for (let i = 0; i < 5; i++) out.offense.push(empty("OL", "OL", ["OL", i]));
  }
  applyFlex(out, "RB2", "REC4");
  return out;
}

/**
 * Schematische Aufstellung in Yards: x quer zum Feld, z in Spielrichtung (Line of Scrimmage bei z = 0,
 * Offense bei z > 0). Reine Darstellung einer Grundformation - die Daten enthalten keine Positionen
 * auf dem Feld, und innerhalb einer Gruppe (z. B. DB1 bis DB4) sagt der Platz nichts ueber die Aufgabe.
 */
export const FORMATION: Record<RosterPosition, [x: number, z: number][]> = {
  QB: [[0, 5.2]],
  RB: [[-2.6, 6.6], [2.6, 6.6]],
  WR: [[-15, 1.2], [15, 1.2], [10.5, 2.4]],
  TE: [[6.6, 1.3]],
  OL: [[-4.4, 1.2], [-2.2, 1.2], [0, 1.2], [2.2, 1.2], [4.4, 1.2]],
  DL: [[-4.8, -1.3], [-1.6, -1.3], [1.6, -1.3], [4.8, -1.3]],
  LB: [[0, -5], [-5.5, -5], [5.5, -5]],
  DB: [[-14, -6.5], [14, -6.5], [-5, -11.5], [5, -11.5]],
  K: [],
  P: [],
};

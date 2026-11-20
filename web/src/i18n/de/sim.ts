/**
 * Texte der Spielsimulation, die die Engine selbst erzeugt (Spielverlauf, Wahrscheinlichkeiten und ihre
 * Grundlage). Reine Funktionen ohne Imports – die Engine läuft auch in Node (Tests).
 * Namen (Spieler, Teamkürzel) kommen als Werte herein und werden nie übersetzt.
 */
const pct = (p: number) => `${Math.round(p * 100)} %`;
const n1 = (x: number) => x.toFixed(1).replace(".", ",");
const yd = (n: number) => `${n} ${Math.abs(n) === 1 ? "Yard" : "Yards"}`;
const by = (name: string | null) => (name ? ` ${name}` : "");

export const simText = {
  pct,
  yd,
  qb: "QB",
  league: "Ligaschnitt 2026",
  twoPt: "2-Point Conversion gelingt",
  twoPtBasis: (rate: number) => `Ligaschnitt 2026 (Teamquote für den Versuch: ${pct(rate)})`,
  twoPtText: (ok: boolean) => (ok ? "2-Point Conversion gelingt" : "2-Point Conversion scheitert"),
  xp: "Extra Point",
  xpBasis: (kicker: string | null) => (kicker ? `${kicker}: Quote 2026 (geglättet)` : "Ligaschnitt 2026 (kein Kicker in den Bögen)"),
  xpText: (kicker: string | null, ok: boolean) => `Extra Point${by(kicker)} ${ok ? "gut" : "verfehlt"}`,
  touchback: "Touchback",
  koTbBasis: (abbr: string) => `${abbr}: Kickoff-Touchbacks 2026 (geglättet)`,
  koTb: (abbr: string) => `Kickoff ${abbr} – Touchback`,
  returnTd: "Return-Touchdown",
  koReturnTd: (ret: string | null) => `Kickoff-Return-Touchdown${by(ret)}!`,
  koReturn: (abbr: string, ret: string | null, yds: number) => `Kickoff ${abbr}${ret ? ` – Return ${ret}` : ""} ${yd(yds)}`,
  safety: " – Safety!",
  firstDown: " – First Down",
  downs: " – Ballverlust nach Downs",
  fumble: "Fumble",
  fumbleBasis: (name: string) => `${name}: Fumbles pro Ballkontakt 2026 (geglättet)`,
  fumbleKept: " – Fumble, aber gesichert",
  fumbleLost: (abbr: string, forcer: string | null) => ` – Fumble! ${abbr} erobert den Ball${forcer ? ` (${forcer})` : ""}`,
  fumbleTd: " und trägt ihn in die Endzone",
  sack: "Sack",
  sackBasis: (off: string, taken: number, def: string, rate: number, league: number) =>
    `${off} erleidet ${pct(taken)} · ${def} erzielt ${pct(rate)} der Dropbacks · Liga ${pct(league)}`,
  sackText: (sacker: string | null, loss: number) => `Sack${sacker ? ` durch ${sacker}` : ""}: ${yd(loss)}`,
  noTarget: "Pass ohne Anspielstation",
  noTargetBasis: "Ligaschnitt 2026: Passversuche ohne Target",
  noTargetText: (qb: string) => `${qb}: Pass ins Leere (keine Anspielstation)`,
  h2h: (abbr: string, games: number, w: number) => (games ? ` · direkt gegen ${abbr}: ${games} Spiel${games > 1 ? "e" : ""}, Gewicht ${pct(w)}` : ""),
  reception: "Reception",
  receptionBasis: (rec: string, rate: number, h2h: string, qb: string | null, cmp: number, def: string, allowed: number) =>
    `${rec} fängt ${pct(rate)} seiner Targets${h2h} · ${qb ? `${qb} ${pct(cmp)} Completions` : "QB Ligaschnitt"} · ${def} lässt ${pct(allowed)} zu`,
  interception: "Interception",
  intBasis: (qb: string | null, qbRate: number, def: string, rate: number, league: number) =>
    `${qb ? `${qb} ${pct(qbRate)}` : "QB Liga"} · ${def} ${pct(rate)} pro Passversuch · Liga ${pct(league)}`,
  incomplete: "Incomplete",
  passTd: (qb: string, rec: string, yds: number) => `${qb} → ${rec}: ${yd(yds)} – Touchdown!`,
  pass: (qb: string, rec: string, yds: number) => `${qb} → ${rec}: ${yd(yds)}`,
  passInt: (qb: string, rec: string, picker: string | null) => `${qb} → ${rec}: Interception${picker ? ` durch ${picker}` : ""}`,
  intReturnTd: "Return-Touchdown nach Interception",
  intTouchback: " in der Endzone – Touchback",
  pickSix: " – Pick Six!",
  intReturn: (yds: number) => `, Return ${yd(yds)}`,
  drop: "Drop (wenn nicht gefangen)",
  dropBasis: (rec: string) => `${rec}: Drops pro nicht gefangenem Target 2026 (geglättet)`,
  dropped: (qb: string, rec: string) => `${qb} → ${rec}: fallen gelassen`,
  defended: (qb: string, rec: string, d: string | null) => `${qb} → ${rec}: abgewehrt${d ? ` von ${d}` : ""}`,
  incompleteText: (qb: string, rec: string) => `${qb} → ${rec}: unvollständig`,
  run: "Lauf",
  tfl: "Raumverlust (Tackle for Loss)",
  tflBasis: (def: string, rate: number, off: string, allowed: number, league: number) => `${def} ${pct(rate)} · ${off} erleidet ${pct(allowed)} · Liga ${pct(league)}`,
  expected: (mean: number) => `Ø ${n1(mean)} Yards erwartet`,
  expectedBasis: (name: string, ypc: number, def: string, games: number, w: number, allowed: number, league: number) =>
    `${name} ${n1(ypc)} Y/Lauf${games ? ` (direkt gegen ${def}: ${games} Spiel${games > 1 ? "e" : ""}, Gewicht ${pct(w)})` : ""} · ${def} lässt ${n1(allowed)} zu · Liga ${n1(league)}`,
  runTd: (name: string, yds: number) => `${name}: ${yd(yds)} Lauf – Touchdown!`,
  runText: (name: string, yds: number) => `${name}: ${yd(yds)} Lauf`,
  fg: (dist: number) => `Field Goal aus ${dist} Yards`,
  fgBasis: (kicker: string | null, rate: number) => `${kicker ? `${kicker}: ${pct(rate)} Treffer 2026 (geglättet)` : "Ligaschnitt"} · Distanzabzug (Simulationsparameter)`,
  fgText: (kicker: string | null, dist: number, ok: boolean) => `Field Goal${by(kicker)} aus ${dist} Yards – ${ok ? "gut" : "verfehlt"}`,
  punt: (punter: string | null) => (punter ? `Punt ${punter}` : "Punt"),
  puntTb: (who: string) => `${who} – Touchback`,
  puntReturn: "Punt Return",
  puntReturnBasis: (abbr: string) => `${abbr}: Returns pro gegnerischem Punt 2026`,
  puntReturnTd: (who: string, gross: number, ret: string | null) => `${who} ${gross} Yards – Return-Touchdown${by(ret)}!`,
  puntReturned: (who: string, gross: number, ret: string | null, yds: number) => `${who} ${gross} Yards, Return${by(ret)} ${yd(yds)}`,
  puntText: (who: string, gross: number) => `${who} ${gross} Yards`,
  penalty: (abbr: string) => `Strafe ${abbr}`,
  penaltyBasis: (abbr: string, yds: number) => `${abbr}: Strafen pro Snap 2026 · Ø ${n1(yds)} Yards`,
  penaltyOff: (abbr: string, yds: number) => `Strafe gegen ${abbr}: ${yds} Yards zurück`,
  penaltyDef: (abbr: string, yds: number) => `Strafe gegen ${abbr}: ${yds} Yards`,
  goForIt: "4th Down ausspielen",
  goForItBasis: (abbr: string, rate: number) => `${abbr}: geht in ${pct(rate)} der 4th Downs drauf (2026) · angepasst an Distanz/Feldposition (Simulationsregel)`,
};

export type SimText = {
  [K in keyof typeof simText]: (typeof simText)[K] extends string ? string : (typeof simText)[K] extends (...a: infer A) => string ? (...a: A) => string : never;
};

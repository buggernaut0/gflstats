/**
 * Simulator – Wahrscheinlichkeitsmodell.
 *
 * Aus den Bögen 2026 werden Quoten für Liga, Teams und Spieler berechnet (immer mit Shrinkage zum
 * Ligaschnitt, siehe params.ts). Für ein Ereignis werden die beteiligten Quoten in Log-Odds relativ zur
 * Liga zusammengeführt:
 *
 *   logit(p) = logit(Liga) + Σ wᵢ · [logit(Quoteᵢ) − logit(Ligaᵢ)]
 *
 * Ein Wert über dem Ligaschnitt erhöht die Chance, einer darunter senkt sie – entschieden wird das
 * einzelne Ereignis danach per Zufall (engine.ts).
 *
 * Besonderheit der Bögen: Sacks sind als Läufe des Quarterbacks verbucht. Echte (geplante) Läufe =
 * Läufe − erlittene Sacks; die Sack-Yards stammen aus der Regression in scripts/export-sim.ts.
 */
import { PARAMS } from './params.ts';
import type { SimData, SimPlayer, SimTeam, Stats } from './types.ts';

const v = (s: Stats, k: string) => s[k] ?? 0;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const logit = (p: number) => { const q = clamp(p, 1e-4, 1 - 1e-4); return Math.log(q / (1 - q)); };
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** (Ereignisse + k · Liga) / (Versuche + k) */
export const shrink = (events: number, trials: number, prior: number, k: number) => (events + k * prior) / (Math.max(trials, 0) + k);

export interface Part { rate: number; ref: number; w: number }
/** Log-Odds-Kombination relativ zur Liga. */
export function combine(base: number, parts: Part[]) {
  return sigmoid(logit(base) + parts.reduce((x, p) => x + p.w * (logit(p.rate) - logit(p.ref)), 0));
}
/** Multiplikative Kombination von Mittelwerten relativ zur Liga. */
export const combineMean = (base: number, parts: { value: number; ref: number; e: number }[]) =>
  parts.reduce((m, p) => m * Math.pow(Math.max(p.value, 0.1) / p.ref, p.e), base);

const ratio = (a: number, b: number, fallback = 0) => (b > 0 ? a / b : fallback);

// ─────────────────────────────────────────────────────────── Liga

export interface League {
  teamGames: number;
  sackYards: number;
  passRate: number;
  sack: number;
  cmpPerAtt: number;
  intPerAtt: number;
  targetShare: number;
  catchPerTarget: number;
  intPerTarget: number;
  ypc: number;
  /** Luft-Yards pro Reception = (Receiving Yards − YAC) / Receptions */
  airPerCatch: number;
  dropPerIncTarget: number;
  pbuPerIncTarget: number;
  ypcRun: number;
  tfl: number;
  lossYds: number;
  fumblePerTouch: number;
  fumbleLostShare: number;
  fumbleReturnTd: number;
  intReturn: number;
  intReturnTd: number;
  puntGross: number;
  puntReturnRate: number;
  puntReturnAvg: number;
  puntReturnTd: number;
  koTouchback: number;
  koReturnAvg: number;
  koReturnTd: number;
  fg: number;
  fgMadeDistance: number;
  patKick: number;
  twoPtRate: number;
  twoPtSuccess: number;
  penaltiesPerTeamGame: number;
  penaltyYds: number;
  playsPerTeamGame: number;
  /** 4th-Down-Versuche ÷ 4th-Down-Situationen (Versuche + Punts + FG-Versuche), aus den Spielberichten */
  goRate4th: number;
  conv3rd: number;
  conv4th: number;
  /** Sekunden pro Spielzug mit laufender Uhr (abgeleitet, damit die Spielzuganzahl der echten entspricht) */
  runningSeconds: number;
}

export function leagueModel(data: SimData): League {
  const T = data.league.totals;
  const tg = data.league.teamGames;
  const sacks = v(T, 'sacktotal');
  const dropbacks = v(T, 'pass') + sacks;
  const designed = v(T, 'run') - sacks;
  const targets = v(T, 'catched') + v(T, 'intended');
  const twoTries = v(T, 'patrungood') + v(T, 'patrunnogood') + v(T, 'patpasscatchedgood') + v(T, 'patpassnogood');
  const playsPerTeamGame = (v(T, 'pass') + v(T, 'run')) / tg;
  const incPerPlay = ratio(v(T, 'pass') - v(T, 'complete'), v(T, 'pass') + v(T, 'run'));
  const specialPerGame = (v(T, 'punt') + v(T, 'kickoff') + v(T, 'fieldgoaltry')) / data.league.games;
  const P = playsPerTeamGame * 2;
  const total = PARAMS.rules.quarterSeconds * 4;
  const runningSeconds = (total - specialPerGame * PARAMS.clock.special - P * incPerPlay * PARAMS.clock.stopped) / (P * (1 - incPerPlay));
  const fourth = data.teams.map(fourthDown);
  const sumF = (k: 'att' | 'situations') => fourth.reduce((x, f) => x + f[k], 0);
  const rep = (k: string) => data.teams.reduce((x, t) => x + (t.report[k]?.sum ?? 0), 0);
  return {
    goRate4th: ratio(sumF('att'), sumF('situations'), 0.3),
    conv3rd: ratio(rep('thirdConv'), rep('thirdAtt'), 0.38),
    conv4th: ratio(rep('fourthConv'), rep('fourthAtt'), 0.4),
    teamGames: tg,
    sackYards: data.league.sackYards,
    passRate: dropbacks / (dropbacks + designed),
    sack: sacks / dropbacks,
    cmpPerAtt: ratio(v(T, 'complete'), v(T, 'pass')),
    intPerAtt: ratio(v(T, 'interception'), v(T, 'pass')),
    targetShare: Math.min(1, ratio(targets, v(T, 'pass'))),
    catchPerTarget: ratio(v(T, 'catched'), targets),
    intPerTarget: ratio(v(T, 'interception'), targets),
    ypc: ratio(v(T, 'receivingyards'), v(T, 'catched')),
    airPerCatch: ratio(v(T, 'receivingyards') - v(T, 'yac'), v(T, 'catched'), 6),
    dropPerIncTarget: ratio(v(T, 'droppedpass'), v(T, 'intended')),
    pbuPerIncTarget: ratio(v(T, 'brokenuppass'), v(T, 'intended')),
    ypcRun: ratio(v(T, 'runyards') - data.league.sackYards * sacks, designed),
    tfl: ratio(v(T, 'tackleforloss'), designed),
    lossYds: ratio(v(T, 'runyardsloss') - data.league.sackYards * sacks, v(T, 'tackleforloss'), -3),
    fumblePerTouch: ratio(v(T, 'fumbled'), v(T, 'catched') + v(T, 'run')),
    fumbleLostShare: ratio(v(T, 'fumbledandlost'), v(T, 'fumbled')),
    fumbleReturnTd: ratio(v(T, 'fumblereturntouchdown'), v(T, 'fumbledandlost')),
    intReturn: ratio(v(T, 'interceptionreturnyards'), v(T, 'intercepted')),
    intReturnTd: ratio(v(T, 'interceptionreturntouchdown'), v(T, 'intercepted')),
    puntGross: ratio(v(T, 'puntyards'), v(T, 'punt')),
    puntReturnRate: ratio(v(T, 'puntreturn'), v(T, 'punt')),
    puntReturnAvg: ratio(v(T, 'puntreturnyards'), v(T, 'puntreturn')),
    puntReturnTd: ratio(v(T, 'puntreturntouchdown'), v(T, 'puntreturn')),
    koTouchback: ratio(v(T, 'kickofftouchback'), v(T, 'kickoff')),
    koReturnAvg: ratio(v(T, 'kickoffreturnyards'), v(T, 'kickoffreturn')),
    koReturnTd: ratio(v(T, 'kickoffreturntouchdown'), v(T, 'kickoffreturn')),
    fg: ratio(v(T, 'fieldgoalgood'), v(T, 'fieldgoaltry')),
    fgMadeDistance: ratio(v(T, 'fieldgoalyards'), v(T, 'fieldgoalgood'), 33),
    patKick: ratio(v(T, 'patkickgood'), v(T, 'patkick')),
    twoPtRate: ratio(twoTries, twoTries + v(T, 'patkick')),
    twoPtSuccess: ratio(v(T, 'patrungood') + v(T, 'patpasscatchedgood'), twoTries, 0.5),
    penaltiesPerTeamGame: v(T, 'penalty') / tg,
    penaltyYds: ratio(v(T, 'penaltyyards'), v(T, 'penalty'), 8),
    playsPerTeamGame,
    runningSeconds,
  };
}

/**
 * 4th-Down-Neigung eines Teams. Der Spielbericht nennt Versuche nur, wenn es welche gab: fehlt der Wert in
 * einem Spiel mit Bericht (3rd-Down-Angabe vorhanden), zählt das als 0 Versuche. Hochgerechnet auf alle
 * Spiele des Teams, damit Punts/FG (aus den Bögen) und Versuche dieselbe Basis haben.
 */
export function fourthDown(team: SimTeam) {
  const reportGames = team.report.thirdAtt?.games ?? 0;
  const attPerGame = reportGames ? (team.report.fourthAtt?.sum ?? 0) / reportGames : 0;
  const att = attPerGame * team.games;
  const situations = att + v(team.own, 'punt') + v(team.own, 'fieldgoaltry');
  return { att, situations, known: reportGames > 0 };
}

// ─────────────────────────────────────────────────────────── Spieler- und Teamprofile

export interface QbProfile { player: SimPlayer; cmp: number; int: number; ypc: number; fumble: number }
export interface ReceiverProfile { player: SimPlayer; weight: number; targets: number; catch: number; ypr: number; drop: number; fumble: number }
export interface RusherProfile { player: SimPlayer; weight: number; carries: number; ypc: number; fumble: number }
export interface DefenderProfile { player: SimPlayer; tackle: number; sack: number; int: number; pbu: number; tfl: number }

export interface TeamProfile {
  team: SimTeam;
  games: number;
  // Offense
  passRate: number;
  sackTaken: number;
  tflAllowed: number;
  qb: QbProfile | null;
  receivers: ReceiverProfile[];
  rushers: RusherProfile[];
  // Defense
  sackRate: number;
  cmpAllowed: number;
  intRate: number;
  yprAllowed: number;
  ypcAllowed: number;
  tflRate: number;
  pbuRate: number;
  defenders: DefenderProfile[];
  // Special Teams
  kicker: { player: SimPlayer; fg: number; pat: number; maxDistance: number } | null;
  punter: { player: SimPlayer; gross: number } | null;
  kickReturners: { player: SimPlayer; weight: number }[];
  puntReturners: { player: SimPlayer; weight: number }[];
  koTouchback: number;
  koReturnAvg: number;
  puntReturnRate: number;
  puntReturnAvg: number;
  twoPtRate: number;
  /** Go-for-it-Quote bei 4th Down (geglättet) */
  goRate4th: number;
  // Sonstiges
  penaltyPerSnap: number;
  penaltyYds: number;
  /** Sekunden pro Spielzug mit laufender Uhr (Tempo des Teams) */
  runningSeconds: number;
}

const isQb = (p: SimPlayer) => p.role === 'QB' || v(p.stats, 'pass') >= 10;

export function teamProfile(team: SimTeam, L: League): TeamProfile {
  const K = PARAMS.k;
  const own = team.own, opp = team.opp;
  const sacksTaken = v(opp, 'sacktotal');
  const dropbacks = v(own, 'pass') + sacksTaken;
  const designed = Math.max(v(own, 'run') - sacksTaken, 0);
  const oppSacks = v(own, 'sacktotal');
  const oppDesigned = Math.max(v(opp, 'run') - oppSacks, 0);
  const ownPass = v(own, 'pass');

  // Quarterback: meiste Passversuche (Starter laut Lineup bevorzugt)
  const qbs = team.players.filter((p) => v(p.stats, 'pass') > 0).sort((a, b) => v(b.stats, 'pass') - v(a.stats, 'pass'));
  const qbPlayer = qbs.find((p) => p.lineupGroup === 'QB') ?? qbs[0] ?? null;
  const qb: QbProfile | null = qbPlayer && {
    player: qbPlayer,
    cmp: shrink(v(qbPlayer.stats, 'complete'), v(qbPlayer.stats, 'pass'), L.cmpPerAtt, K.qbCmp),
    int: shrink(v(qbPlayer.stats, 'interception'), v(qbPlayer.stats, 'pass'), L.intPerAtt, K.qbInt),
    ypc: (v(qbPlayer.stats, 'passingyards') + K.qbYpc * L.ypc) / (v(qbPlayer.stats, 'complete') + K.qbYpc),
    fumble: shrink(v(qbPlayer.stats, 'fumbled'), v(qbPlayer.stats, 'run') + v(qbPlayer.stats, 'catched'), L.fumblePerTouch, K.fumble),
  };

  const fumbleOf = (p: SimPlayer) => shrink(v(p.stats, 'fumbled'), v(p.stats, 'catched') + v(p.stats, 'run'), L.fumblePerTouch, K.fumble);

  const receivers: ReceiverProfile[] = team.players
    .map((p) => {
      const targets = v(p.stats, 'catched') + v(p.stats, 'intended');
      return {
        player: p,
        weight: targets,
        targets,
        catch: shrink(v(p.stats, 'catched'), targets, L.catchPerTarget, K.recCatch),
        ypr: (v(p.stats, 'receivingyards') + K.recYpr * L.ypc) / (v(p.stats, 'catched') + K.recYpr),
        drop: shrink(v(p.stats, 'droppedpass'), v(p.stats, 'intended'), L.dropPerIncTarget, K.recDrop),
        fumble: fumbleOf(p),
      };
    })
    .filter((r) => r.targets > 0)
    .sort((a, b) => b.weight - a.weight);

  // Läufer: geplante Läufe. Quarterbacks: Läufe minus ihr Anteil an den erlittenen Sacks.
  const rushers: RusherProfile[] = team.players
    .map((p) => {
      let carries = v(p.stats, 'run');
      let yards = v(p.stats, 'runyards');
      if (isQb(p) && ownPass > 0) {
        const sacks = sacksTaken * (v(p.stats, 'pass') / ownPass);
        carries = Math.max(carries - sacks, 0);
        yards -= L.sackYards * sacks;
      }
      return { player: p, weight: carries, carries, ypc: (yards + K.ypcCarrier * L.ypcRun) / (carries + K.ypcCarrier), fumble: fumbleOf(p) };
    })
    .filter((r) => r.carries >= 0.5)
    .sort((a, b) => b.weight - a.weight);

  const defenders: DefenderProfile[] = team.players
    .filter((p) => p.role === 'DEF' || (p.role == null && v(p.stats, 'tackletotal') + v(p.stats, 'intercepted') + v(p.stats, 'brokenuppass') > 0))
    .map((p) => ({
      player: p,
      tackle: v(p.stats, 'tackletotal'),
      sack: v(p.stats, 'sacktotal'),
      int: v(p.stats, 'intercepted'),
      pbu: v(p.stats, 'brokenuppass'),
      tfl: v(p.stats, 'tackleforloss'),
    }))
    .filter((d) => d.tackle + d.sack + d.int + d.pbu + d.tfl > 0)
    .sort((a, b) => b.tackle - a.tackle);

  const kickerP = [...team.players].sort((a, b) => (v(b.stats, 'fieldgoaltry') + v(b.stats, 'patkick')) - (v(a.stats, 'fieldgoaltry') + v(a.stats, 'patkick')))[0];
  const kicker = kickerP && v(kickerP.stats, 'fieldgoaltry') + v(kickerP.stats, 'patkick') > 0
    ? {
      player: kickerP,
      fg: shrink(v(kickerP.stats, 'fieldgoalgood'), v(kickerP.stats, 'fieldgoaltry'), L.fg, K.fg),
      pat: shrink(v(kickerP.stats, 'patkickgood'), v(kickerP.stats, 'patkick'), L.patKick, K.pat),
      maxDistance: clamp(v(kickerP.stats, 'longestfieldgoal') + PARAMS.fg.maxOverLongest, PARAMS.fg.minMaxDistance, PARAMS.fg.maxDistance),
    }
    : null;
  const punterP = [...team.players].sort((a, b) => v(b.stats, 'punt') - v(a.stats, 'punt'))[0];
  const punter = punterP && v(punterP.stats, 'punt') > 0
    ? { player: punterP, gross: (v(punterP.stats, 'puntyards') + K.punt * L.puntGross) / (v(punterP.stats, 'punt') + K.punt) }
    : null;

  const ownTwo = v(own, 'patrungood') + v(own, 'patrunnogood') + v(own, 'patpasscatchedgood') + v(own, 'patpassnogood');
  const plays = (v(own, 'pass') + v(own, 'run')) / Math.max(team.games, 1);

  return {
    team,
    games: team.games,
    passRate: shrink(dropbacks, dropbacks + designed, L.passRate, K.passRate),
    sackTaken: shrink(sacksTaken, dropbacks, L.sack, K.sack),
    tflAllowed: shrink(v(opp, 'tackleforloss'), designed, L.tfl, K.tfl),
    qb,
    receivers,
    rushers,
    sackRate: shrink(oppSacks, v(opp, 'pass') + oppSacks, L.sack, K.sack),
    cmpAllowed: shrink(v(opp, 'complete'), v(opp, 'pass'), L.cmpPerAtt, K.cmpTeam),
    intRate: shrink(v(opp, 'interception'), v(opp, 'pass'), L.intPerAtt, K.intTeam),
    yprAllowed: (v(opp, 'receivingyards') + K.defYpr * L.ypc) / (v(opp, 'catched') + K.defYpr),
    ypcAllowed: (v(opp, 'runyards') - L.sackYards * oppSacks + K.ypcDef * L.ypcRun) / (oppDesigned + K.ypcDef),
    tflRate: shrink(v(own, 'tackleforloss'), oppDesigned, L.tfl, K.tfl),
    pbuRate: shrink(v(own, 'brokenuppass'), v(opp, 'intended'), L.pbuPerIncTarget, K.pbu),
    defenders,
    kicker,
    punter,
    kickReturners: team.players.filter((p) => v(p.stats, 'kickoffreturn') > 0).map((p) => ({ player: p, weight: v(p.stats, 'kickoffreturn') })),
    puntReturners: team.players.filter((p) => v(p.stats, 'puntreturn') > 0).map((p) => ({ player: p, weight: v(p.stats, 'puntreturn') })),
    koTouchback: shrink(v(own, 'kickofftouchback'), v(own, 'kickoff'), L.koTouchback, K.koTouchback),
    koReturnAvg: (v(own, 'kickoffreturnyards') + K.returns * L.koReturnAvg) / (v(own, 'kickoffreturn') + K.returns),
    puntReturnRate: shrink(v(own, 'puntreturn'), v(opp, 'punt'), L.puntReturnRate, K.returns),
    puntReturnAvg: (v(own, 'puntreturnyards') + K.returns * L.puntReturnAvg) / (v(own, 'puntreturn') + K.returns),
    twoPtRate: shrink(ownTwo, ownTwo + v(own, 'patkick'), L.twoPtRate, K.twoPt),
    goRate4th: (() => {
      const f = fourthDown(team);
      return f.known ? shrink(f.att, f.situations, L.goRate4th, PARAMS.fourth.k) : L.goRate4th;
    })(),
    penaltyPerSnap: (v(own, 'penalty') / Math.max(team.games, 1)) / (2 * L.playsPerTeamGame),
    penaltyYds: ratio(v(own, 'penaltyyards'), v(own, 'penalty'), L.penaltyYds),
    runningSeconds: L.runningSeconds * clamp(L.playsPerTeamGame / Math.max(plays, 1), 0.75, 1.35),
  };
}

// ─────────────────────────────────────────────────────────── Direkte Aufeinandertreffen

/**
 * Werte eines Spielers aus den Spielen gegen genau dieses Team (2026). Teamebene – die Bögen sagen nicht,
 * wer wen gedeckt hat. Gewicht n / (n + k), höchstens cap: die Saisonwerte bleiben die Grundlage.
 */
export function h2hWeight(n: number, k: number) {
  return Math.min(PARAMS.h2h.cap, n / (n + k));
}

export function receiverVs(r: ReceiverProfile, oppId: string) {
  const vs = r.player.vs[oppId];
  if (!vs) return { catch: r.catch, ypr: r.ypr, games: 0, w: 0 };
  const t = v(vs.stats, 'catched') + v(vs.stats, 'intended');
  const w = h2hWeight(t, PARAMS.h2h.kTargets);
  const catchVs = ratio(v(vs.stats, 'catched'), t, r.catch);
  const yprVs = ratio(v(vs.stats, 'receivingyards'), v(vs.stats, 'catched'), r.ypr);
  return { catch: (1 - w) * r.catch + w * catchVs, ypr: (1 - w) * r.ypr + w * yprVs, games: vs.games, w };
}

export function rusherVs(r: RusherProfile, oppId: string) {
  const vs = r.player.vs[oppId];
  if (!vs || isQb(r.player)) return { ypc: r.ypc, games: 0, w: 0 };
  const n = v(vs.stats, 'run');
  const w = h2hWeight(n, PARAMS.h2h.kCarries);
  return { ypc: (1 - w) * r.ypc + w * ratio(v(vs.stats, 'runyards'), n, r.ypc), games: vs.games, w };
}

export function qbVs(q: QbProfile, oppId: string) {
  const vs = q.player.vs[oppId];
  if (!vs) return { cmp: q.cmp, games: 0, w: 0 };
  const n = v(vs.stats, 'pass');
  const w = h2hWeight(n, PARAMS.h2h.kPasses);
  return { cmp: (1 - w) * q.cmp + w * ratio(v(vs.stats, 'complete'), n, q.cmp), games: vs.games, w };
}

export function buildProfiles(data: SimData) {
  const league = leagueModel(data);
  const teams = new Map(data.teams.map((t) => [t.id, teamProfile(t, league)]));
  return { league, teams };
}

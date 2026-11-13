/**
 * Simulator – Engine (vollautomatisch, keine Eingriffe des Nutzers).
 *
 * Berechnet ein komplettes Spiel Spielzug für Spielzug: Kickoff, Downs, First Downs, Punts, Field Goals,
 * PAT/2-Point, Turnovers, Safety, vier Viertel à 12 Minuten. Jede Entscheidung zieht aus dem Zufalls-
 * generator mit Startwert; die Ausgangswahrscheinlichkeiten kommen aus model.ts (Bögen 2026).
 *
 * Die Engine kennt keine Darstellung. Sie liefert eine Ereignisliste (PlayEvent[]), die eine Ansicht
 * später abspielt.
 *
 * Bewusst nicht modelliert (keine Daten dafür): Verletzungen/Wechsel, Timeouts, Two-Minute-Uhrregeln,
 * Overtime (ein Unentschieden bleibt stehen), Strafen während des Spielzugs, Heimvorteil.
 */
import { PARAMS } from './params.ts';
import {
  combine, combineMean, logit, qbVs, receiverVs, rusherVs, sigmoid,
  type DefenderProfile, type League, type TeamProfile,
} from './model.ts';
import { createRng, type Rng } from './rng.ts';
import type { BoxLine, Chance, GameResult, Outcome, PlayEvent, PlayType, SimPlayer } from './types.ts';

export interface Profiles { league: League; teams: Map<string, TeamProfile> }
export interface SimOptions { seed: number; home: string; away: string }

const pct = (p: number) => `${Math.round(p * 100)} %`;
/** „1 Yard“, „-1 Yard“, sonst „Yards“ */
const yd = (n: number) => `${n} ${Math.abs(n) === 1 ? 'Yard' : 'Yards'}`;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function simulateGame(profiles: Profiles, opts: SimOptions): GameResult {
  const { league: L } = profiles;
  const T = (id: string) => {
    const t = profiles.teams.get(id);
    if (!t) throw new Error(`Team ${id} nicht in den Daten 2026`);
    return t;
  };
  T(opts.home); T(opts.away);
  if (opts.home === opts.away) throw new Error('Zwei verschiedene Teams auswählen');

  const rng: Rng = createRng(opts.seed);
  const Q = PARAMS.rules.quarterSeconds;
  const other = (id: string) => (id === opts.home ? opts.away : opts.home);

  const score: Record<string, number> = { [opts.home]: 0, [opts.away]: 0 };
  const events: PlayEvent[] = [];
  const box: Record<string, BoxLine> = {};
  const teamStats: GameResult['team'] = {};
  for (const id of [opts.home, opts.away]) {
    teamStats[id] = { plays: 0, passAtt: 0, rushAtt: 0, passYds: 0, rushYds: 0, sacks: 0, turnovers: 0, punts: 0, fgTry: 0, firstDowns: 0, longestPass: 0, longestRun: 0 };
  }

  const bx = (team: string, p: SimPlayer): BoxLine =>
    (box[`${team}|${p.id}`] ??= {
      team, name: p.name, pass: 0, complete: 0, passingyards: 0, touchdownpass: 0, interception: 0,
      run: 0, runyards: 0, touchdownrun: 0, targets: 0, catched: 0, receivingyards: 0, touchdowncatch: 0,
      tackles: 0, sacks: 0, intercepted: 0, breakups: 0, fumbles: 0, fgTry: 0, fgGood: 0,
    });

  // ── Zustand ──
  let q = 1;
  let clock = Q;
  let off = rng.chance(0.5) ? opts.home : opts.away; // Münzwurf: wer den ersten Kickoff empfängt
  const firstReceiver = off;
  let yl = 25;
  let down = 1;
  let dist = 10;
  let over = false;
  type Next = { kind: 'kickoff'; team: string; free?: boolean } | { kind: 'play' };
  let next: Next = { kind: 'kickoff', team: other(firstReceiver) };

  const pickDefender = (d: TeamProfile, key: keyof Omit<DefenderProfile, 'player'>): SimPlayer | null => {
    if (!d.defenders.length) return null;
    const w = d.defenders.map((x) => x[key] + 0.05); // kleine Grundchance für jeden eingesetzten Verteidiger
    return d.defenders[rng.weighted(w)].player;
  };

  const base = (type: PlayType, o: string): Omit<PlayEvent, 'outcome' | 'yards' | 'endYardLine' | 'text' | 'chances'> => ({
    index: events.length, quarter: q, clock, offense: o, defense: other(o), down, distance: dist, yardLine: yl,
    type, actors: {}, score: { ...score }, key: false, turnover: false, firstDown: false, elapsed: 0,
  });

  const emit = (e: PlayEvent) => {
    e.score = { ...score };
    events.push(e);
    return e;
  };

  const setFirstDown = (spot: number) => { down = 1; dist = Math.min(10, 100 - spot); };
  const changePossession = (newYl: number) => {
    off = other(off);
    yl = clamp(Math.round(newYl), 1, 99);
    setFirstDown(yl);
  };

  // ── Punkte nach Touchdown ──
  const afterTouchdown = (team: string) => {
    const P = T(team);
    const goForTwo = rng.chance(P.twoPtRate);
    const ev: PlayEvent = { ...base(goForTwo ? 'twopoint' : 'pat', team), yardLine: goForTwo ? 97 : 85, down: 0, distance: 0, outcome: 'pat_good', yards: 0, endYardLine: 100, text: '', chances: [] };
    if (goForTwo) {
      const p = L.twoPtSuccess;
      ev.chances.push({ label: '2-Point Conversion gelingt', p, basis: `Ligaschnitt 2026 (Teamquote für den Versuch: ${pct(P.twoPtRate)})` });
      const ok = rng.chance(p);
      ev.outcome = ok ? 'two_good' : 'two_failed';
      if (ok) { score[team] += 2; ev.points = { team, points: 2 }; }
      ev.text = ok ? '2-Point Conversion gelingt' : '2-Point Conversion scheitert';
    } else {
      const k = P.kicker;
      const p = k?.pat ?? L.patKick;
      ev.chances.push({ label: 'Extra Point', p, basis: k ? `${k.player.name}: Quote 2026 (geglättet)` : 'Ligaschnitt 2026 (kein Kicker in den Bögen)' });
      if (k) ev.actors.kicker = k.player.id;
      const ok = rng.chance(p);
      ev.outcome = ok ? 'pat_good' : 'pat_missed';
      if (ok) { score[team] += 1; ev.points = { team, points: 1 }; }
      ev.text = ok ? `Extra Point${k ? ` ${k.player.name}` : ''} gut` : `Extra Point${k ? ` ${k.player.name}` : ''} verfehlt`;
    }
    emit(ev);
    next = { kind: 'kickoff', team };
  };

  const touchdown = (ev: PlayEvent, team: string) => {
    score[team] += 6;
    ev.points = { team, points: 6 };
    ev.key = true;
    emit(ev);
    afterTouchdown(team);
  };

  // ── Kickoff ──
  const kickoff = (kicking: string, free = false) => {
    const K = T(kicking), R = T(other(kicking));
    off = kicking; down = 0; dist = 0; yl = free ? 20 : 35;
    const ev: PlayEvent = { ...base('kickoff', kicking), outcome: 'kickoff_return', yards: 0, endYardLine: 0, text: '', chances: [], elapsed: PARAMS.clock.special };
    const pTb = free ? 0 : K.koTouchback;
    ev.chances.push({ label: 'Touchback', p: pTb, basis: `${K.team.abbr}: Kickoff-Touchbacks 2026 (geglättet)` });
    let start: number;
    ev.kickDistance = 100 - yl - PARAMS.rules.kickoffCatchSpot;
    if (rng.chance(pTb)) {
      ev.kickDistance = 100 - yl + 3;
      start = PARAMS.rules.kickoffTouchback;
      ev.outcome = 'kickoff_touchback';
      ev.text = `Kickoff ${K.team.abbr} – Touchback`;
    } else {
      const ret = R.kickReturners.length ? R.kickReturners[rng.weighted(R.kickReturners.map((x) => x.weight))].player : null;
      if (ret) ev.actors.returner = ret.id;
      ev.chances.push({ label: 'Return-Touchdown', p: L.koReturnTd, basis: 'Ligaschnitt 2026' });
      if (rng.chance(L.koReturnTd)) {
        ev.outcome = 'kickoff_return_td';
        ev.yards = 100;
        ev.endYardLine = 0;
        ev.text = `Kickoff-Return-Touchdown${ret ? ` ${ret.name}` : ''}!`;
        off = R.team.id;
        touchdown(ev, R.team.id);
        return;
      }
      const retYds = Math.round(rng.lognormal(R.koReturnAvg, PARAMS.sigma.kickReturn));
      start = clamp(PARAMS.rules.kickoffCatchSpot + (free ? PARAMS.rules.safetyKickBonus : 0) + retYds, 1, 95);
      ev.yards = retYds;
      ev.text = `Kickoff ${K.team.abbr}${ret ? ` – Return ${ret.name}` : ''} ${yd(retYds)}`;
    }
    ev.endYardLine = 100 - start;
    emit(ev);
    changePossession(start);
    next = { kind: 'play' };
  };

  // ── Spielzüge ──
  const passRateNow = (O: TeamProfile) => {
    const S = PARAMS.situation;
    let x = logit(O.passRate) + S.base;
    if (down >= 3 && dist >= 7) x += S.longYardage;
    else if (down === 3 && dist >= 3) x += S.mediumThird;
    else if (down >= 2 && dist <= 2) x += S.shortYardage;
    const diff = score[off] - score[other(off)];
    if (q === 4 && diff <= -9) x += S.trailingLate;
    if (q === 4 && diff >= 9) x += S.leadingLate;
    if ((q === 2 || q === 4) && clock <= 120 && diff <= 0) x += S.twoMinute;
    return sigmoid(x);
  };

  /** Ergebnis eines Spielzugs mit Raumgewinn anwenden (Downs, First Down, TD, Safety). */
  const advance = (ev: PlayEvent, gained: number) => {
    const end = yl + gained;
    ev.yards = gained;
    ev.endYardLine = clamp(end, 0, 100);
    const ts = teamStats[off];
    if (end >= 100) {
      ev.yards = 100 - yl;
      ts.firstDowns++;
      ev.firstDown = true;
      touchdown(ev, off);
      return;
    }
    if (end <= 0) {
      ev.outcome = 'safety';
      ev.key = true;
      score[other(off)] += 2;
      ev.points = { team: other(off), points: 2 };
      ev.text += ' – Safety!';
      emit(ev);
      next = { kind: 'kickoff', team: off, free: true };
      return;
    }
    if (gained >= dist) {
      ev.firstDown = true;
      ts.firstDowns++;
      ev.text += ' – First Down';
      emit(ev);
      yl = end;
      setFirstDown(yl);
      return;
    }
    emit(ev);
    yl = end;
    dist -= gained;
    down++;
    if (down > 4) {
      events[events.length - 1].turnover = true;
      events[events.length - 1].text += ' – Ballverlust nach Downs';
      events[events.length - 1].key = true;
      teamStats[off].turnovers++;
      changePossession(100 - yl);
    }
  };

  const fumbleCheck = (ev: PlayEvent, carrier: SimPlayer, rate: number, spotGain: number): boolean => {
    ev.chances.push({ label: 'Fumble', p: rate, basis: `${carrier.name}: Fumbles pro Ballkontakt 2026 (geglättet)` });
    if (!rng.chance(rate)) return false;
    bx(off, carrier).fumbles++;
    const lost = rng.chance(L.fumbleLostShare);
    const D = T(other(off));
    const forcer = pickDefender(D, 'tackle');
    if (forcer) ev.actors.defender = forcer.id;
    if (!lost) { ev.text += ' – Fumble, aber gesichert'; ev.key = true; return false; }
    ev.outcome = 'fumble_lost';
    ev.turnover = true;
    ev.key = true;
    ev.yards = spotGain;
    const spot = clamp(yl + spotGain, 1, 99);
    ev.endYardLine = spot;
    teamStats[off].turnovers++;
    ev.text += ` – Fumble! ${D.team.abbr} erobert den Ball${forcer ? ` (${forcer.name})` : ''}`;
    if (rng.chance(L.fumbleReturnTd)) {
      ev.text += ' und trägt ihn in die Endzone';
      off = other(off);
      touchdown(ev, off);
      return true;
    }
    emit(ev);
    changePossession(100 - spot);
    return true;
  };

  const passPlay = (O: TeamProfile, D: TeamProfile, passRate: number) => {
    const W = PARAMS.w;
    const ev: PlayEvent = { ...base('pass', off), outcome: 'incomplete', yards: 0, endYardLine: yl, text: '', chances: [], passRate };
    const ts = teamStats[off];
    const qb = O.qb;
    if (qb) ev.actors.passer = qb.player.id;

    // 1. Pass Rush
    const pSack = combine(L.sack, [{ rate: O.sackTaken, ref: L.sack, w: W.sackO }, { rate: D.sackRate, ref: L.sack, w: W.sackD }]);
    ev.chances.push({ label: 'Sack', p: pSack, basis: `${O.team.abbr} erleidet ${pct(O.sackTaken)} · ${D.team.abbr} erzielt ${pct(D.sackRate)} der Dropbacks · Liga ${pct(L.sack)}` });
    ts.plays++;
    if (rng.chance(pSack)) {
      ev.type = 'sack';
      ev.outcome = 'sack';
      ev.key = true;
      ev.elapsed = O.runningSeconds;
      const sacker = pickDefender(D, 'sack');
      if (sacker) { ev.actors.defender = sacker.id; bx(D.team.id, sacker).sacks++; }
      const loss = -Math.max(1, Math.round(rng.lognormal(-L.sackYards, PARAMS.sigma.sack)));
      ts.sacks++;
      ev.text = `Sack${sacker ? ` durch ${sacker.name}` : ''}: ${yd(loss)}`;
      if (qb && fumbleCheck(ev, qb.player, qb.fumble, loss)) return;
      advance(ev, loss);
      return;
    }

    ts.passAtt++;
    if (qb) bx(off, qb.player).pass++;

    // 2. Pass ohne Anspielstation (Throwaway, nicht fangbar, Spike)
    const pNoTarget = 1 - L.targetShare;
    if (rng.chance(pNoTarget) || !O.receivers.length) {
      ev.outcome = 'throwaway';
      ev.elapsed = PARAMS.clock.stopped;
      ev.chances.push({ label: 'Pass ohne Anspielstation', p: pNoTarget, basis: 'Ligaschnitt 2026: Passversuche ohne Target' });
      ev.text = `${qb?.player.name ?? 'QB'}: Pass ins Leere (keine Anspielstation)`;
      advance(ev, 0);
      return;
    }

    // 3. Anspielstation
    const rec = O.receivers[rng.weighted(O.receivers.map((r) => r.weight))];
    ev.actors.target = rec.player.id;
    bx(off, rec.player).targets++;
    const rv = receiverVs(rec, D.team.id);
    const qv = qb ? qbVs(qb, D.team.id) : { cmp: L.cmpPerAtt, games: 0, w: 0 };
    const h2hNote = (games: number, w: number) => (games ? ` · direkt gegen ${D.team.abbr}: ${games} Spiel${games > 1 ? 'e' : ''}, Gewicht ${pct(w)}` : '');

    // 4. Ausgang
    const pInt = combine(L.intPerTarget, [
      { rate: qb?.int ?? L.intPerAtt, ref: L.intPerAtt, w: W.qbInt },
      { rate: D.intRate, ref: L.intPerAtt, w: W.defInt },
    ]);
    const pCatch = Math.min(combine(L.catchPerTarget, [
      { rate: rv.catch, ref: L.catchPerTarget, w: W.recCatch },
      { rate: qv.cmp, ref: L.cmpPerAtt, w: W.qbCmp },
      { rate: D.cmpAllowed, ref: L.cmpPerAtt, w: W.defCmp },
    ]), 0.97 - pInt);
    ev.chances.push({
      label: 'Reception',
      p: pCatch,
      basis: `${rec.player.name} fängt ${pct(rv.catch)} seiner Targets${h2hNote(rv.games, rv.w)} · ${qb ? `${qb.player.name} ${pct(qv.cmp)} Completions` : 'QB Ligaschnitt'} · ${D.team.abbr} lässt ${pct(D.cmpAllowed)} zu`,
    });
    ev.chances.push({ label: 'Interception', p: pInt, basis: `${qb ? `${qb.player.name} ${pct(qb.int)}` : 'QB Liga'} · ${D.team.abbr} ${pct(D.intRate)} pro Passversuch · Liga ${pct(L.intPerAtt)}` });
    ev.chances.push({ label: 'Incomplete', p: Math.max(0, 1 - pCatch - pInt) });

    const r = rng.next();
    if (r < pCatch) {
      // Reception
      const mean = combineMean(L.ypc, [
        { value: rv.ypr, ref: L.ypc, e: PARAMS.e.passRec },
        { value: D.yprAllowed, ref: L.ypc, e: PARAMS.e.passDef },
        { value: qb?.ypc ?? L.ypc, ref: L.ypc, e: PARAMS.e.passQb },
      ]);
      ev.expectedYards = Math.round(mean * 10) / 10;
      let y = Math.round(rng.lognormal(mean * PARAMS.fieldLimit.pass, PARAMS.sigma.pass));
      y = Math.min(y, 100 - yl);
      ev.airYards = Math.max(0, Math.round(y * (L.airPerCatch / L.ypc)));
      ev.outcome = 'complete';
      ev.elapsed = O.runningSeconds;
      ts.passYds += y;
      ts.longestPass = Math.max(ts.longestPass, y);
      const rb = bx(off, rec.player);
      rb.catched++; rb.receivingyards += y;
      if (qb) { const qb2 = bx(off, qb.player); qb2.complete++; qb2.passingyards += y; }
      if (y >= 20) ev.key = true;
      const td = yl + y >= 100;
      if (td) {
        rb.touchdowncatch++;
        if (qb) bx(off, qb.player).touchdownpass++;
        ev.outcome = 'touchdown';
        ev.text = `${qb?.player.name ?? 'QB'} → ${rec.player.name}: ${yd(y)} – Touchdown!`;
        advance(ev, y);
        return;
      }
      const tackler = pickDefender(D, 'tackle');
      if (tackler) { ev.actors.tackler = tackler.id; bx(D.team.id, tackler).tackles++; }
      ev.text = `${qb?.player.name ?? 'QB'} → ${rec.player.name}: ${yd(y)}`;
      if (fumbleCheck(ev, rec.player, rec.fumble, y)) return;
      advance(ev, y);
      return;
    }

    ev.elapsed = PARAMS.clock.stopped;
    if (r < pCatch + pInt) {
      // Interception
      const picker = pickDefender(D, 'int');
      ev.outcome = 'interception';
      ev.turnover = true;
      ev.key = true;
      ts.turnovers++;
      if (qb) bx(off, qb.player).interception++;
      if (picker) { ev.actors.defender = picker.id; bx(D.team.id, picker).intercepted++; }
      const depth = Math.round(rng.lognormal(L.airPerCatch * 1.4, PARAMS.sigma.airDepth));
      ev.airYards = depth;
      const spot = yl + depth;
      ev.text = `${qb?.player.name ?? 'QB'} → ${rec.player.name}: Interception${picker ? ` durch ${picker.name}` : ''}`;
      ev.chances.push({ label: 'Return-Touchdown nach Interception', p: L.intReturnTd, basis: 'Ligaschnitt 2026' });
      if (spot >= 100) {
        ev.endYardLine = 100;
        ev.text += ' in der Endzone – Touchback';
        emit(ev);
        changePossession(PARAMS.rules.kickoffTouchback);
        return;
      }
      if (rng.chance(L.intReturnTd)) {
        ev.text += ' – Pick Six!';
        off = other(off);
        touchdown(ev, off);
        return;
      }
      const ret = Math.round(rng.lognormal(Math.max(L.intReturn, 1), PARAMS.sigma.intReturn));
      const newYl = clamp(100 - spot + ret, 1, 95);
      ev.endYardLine = spot;
      if (ret > 0) ev.text += `, Return ${yd(ret)}`;
      emit(ev);
      changePossession(newYl);
      return;
    }

    // Nicht gefangen: Drop, abgewehrt oder unvollständig
    const pDrop = rec.drop;
    const pPbu = D.pbuRate;
    ev.chances.push({ label: 'Drop (wenn nicht gefangen)', p: pDrop, basis: `${rec.player.name}: Drops pro nicht gefangenem Target 2026 (geglättet)` });
    const r2 = rng.next();
    if (r2 < pDrop) {
      ev.outcome = 'drop';
      ev.text = `${qb?.player.name ?? 'QB'} → ${rec.player.name}: fallen gelassen`;
    } else if (r2 < pDrop + pPbu) {
      const d = pickDefender(D, 'pbu');
      ev.outcome = 'breakup';
      if (d) { ev.actors.defender = d.id; bx(D.team.id, d).breakups++; }
      ev.text = `${qb?.player.name ?? 'QB'} → ${rec.player.name}: abgewehrt${d ? ` von ${d.name}` : ''}`;
    } else {
      ev.outcome = 'incomplete';
      ev.text = `${qb?.player.name ?? 'QB'} → ${rec.player.name}: unvollständig`;
    }
    ev.airYards = Math.round(rng.lognormal(L.airPerCatch * 1.3, PARAMS.sigma.airDepth));
    advance(ev, 0);
  };

  const runPlay = (O: TeamProfile, D: TeamProfile, passRate: number) => {
    const ev: PlayEvent = { ...base('run', off), outcome: 'run', yards: 0, endYardLine: yl, text: '', chances: [], passRate };
    const ts = teamStats[off];
    ts.plays++;
    ts.rushAtt++;
    ev.elapsed = O.runningSeconds;
    if (!O.rushers.length) { ev.text = 'Lauf'; advance(ev, 0); return; }
    const rr = O.rushers[rng.weighted(O.rushers.map((x) => x.weight))];
    ev.actors.rusher = rr.player.id;
    const vs = rusherVs(rr, D.team.id);
    const pLoss = combine(L.tfl, [{ rate: D.tflRate, ref: L.tfl, w: PARAMS.w.tflD }, { rate: O.tflAllowed, ref: L.tfl, w: PARAMS.w.tflO }]);
    const mean = combineMean(L.ypcRun, [
      { value: vs.ypc, ref: L.ypcRun, e: PARAMS.e.runCarrier },
      { value: D.ypcAllowed, ref: L.ypcRun, e: PARAMS.e.runDef },
    ]);
    ev.expectedYards = Math.round(mean * 10) / 10;
    ev.chances.push({ label: 'Raumverlust (Tackle for Loss)', p: pLoss, basis: `${D.team.abbr} ${pct(D.tflRate)} · ${O.team.abbr} erleidet ${pct(O.tflAllowed)} · Liga ${pct(L.tfl)}` });
    ev.chances.push({
      label: `Ø ${mean.toFixed(1)} Yards erwartet`,
      p: 1 - pLoss,
      basis: `${rr.player.name} ${vs.ypc.toFixed(1)} Y/Lauf${vs.games ? ` (direkt gegen ${D.team.abbr}: ${vs.games} Spiel${vs.games > 1 ? 'e' : ''}, Gewicht ${pct(vs.w)})` : ''} · ${D.team.abbr} lässt ${D.ypcAllowed.toFixed(1)} zu · Liga ${L.ypcRun.toFixed(1)}`,
    });
    let y: number;
    let tackler: SimPlayer | null;
    if (rng.chance(pLoss)) {
      y = -Math.max(1, Math.round(rng.lognormal(-L.lossYds, PARAMS.sigma.loss)));
      tackler = pickDefender(D, 'tfl');
    } else {
      const posMean = Math.max(1, (mean * PARAMS.fieldLimit.run - pLoss * L.lossYds) / (1 - pLoss));
      y = Math.round(rng.lognormal(posMean, PARAMS.sigma.run));
      tackler = pickDefender(D, 'tackle');
    }
    y = Math.min(y, 100 - yl);
    ts.rushYds += y;
    ts.longestRun = Math.max(ts.longestRun, y);
    const b = bx(off, rr.player);
    b.run++; b.runyards += y;
    if (y >= 20) ev.key = true;
    if (yl + y >= 100) {
      b.touchdownrun++;
      ev.outcome = 'touchdown';
      ev.text = `${rr.player.name}: ${yd(y)} Lauf – Touchdown!`;
      advance(ev, y);
      return;
    }
    if (tackler) { ev.actors.tackler = tackler.id; bx(D.team.id, tackler).tackles++; }
    ev.text = `${rr.player.name}: ${yd(y)} Lauf`;
    if (fumbleCheck(ev, rr.player, rr.fumble, y)) return;
    advance(ev, y);
  };

  const fieldGoal = (O: TeamProfile) => {
    const distance = 100 - yl + PARAMS.fg.snapAndHold;
    const k = O.kicker;
    const ev: PlayEvent = { ...base('fieldgoal', off), outcome: 'fg_missed', yards: distance, endYardLine: yl, text: '', chances: [], elapsed: PARAMS.clock.special, key: true };
    const baseRate = k?.fg ?? L.fg;
    const p = sigmoid(logit(baseRate) - PARAMS.fg.slopePerYard * (distance - L.fgMadeDistance));
    ev.chances.push({ label: `Field Goal aus ${distance} Yards`, p, basis: `${k ? `${k.player.name}: ${pct(k.fg)} Treffer 2026 (geglättet)` : 'Ligaschnitt'} · Distanzabzug (Simulationsparameter)` });
    teamStats[off].fgTry++;
    if (k) { ev.actors.kicker = k.player.id; bx(off, k.player).fgTry++; }
    if (rng.chance(p)) {
      ev.outcome = 'fg_good';
      score[off] += 3;
      ev.points = { team: off, points: 3 };
      if (k) bx(off, k.player).fgGood++;
      ev.text = `Field Goal${k ? ` ${k.player.name}` : ''} aus ${distance} Yards – gut`;
      emit(ev);
      next = { kind: 'kickoff', team: off };
      return;
    }
    ev.text = `Field Goal${k ? ` ${k.player.name}` : ''} aus ${distance} Yards – verfehlt`;
    ev.turnover = true;
    emit(ev);
    const spot = yl - 7;
    changePossession(Math.max(PARAMS.rules.missedFgMinSpot, 100 - spot));
  };

  const punt = (O: TeamProfile) => {
    const R = T(other(off));
    const ev: PlayEvent = { ...base('punt', off), outcome: 'punt', yards: 0, endYardLine: yl, text: '', chances: [], elapsed: PARAMS.clock.special };
    teamStats[off].punts++;
    const gross = Math.round(rng.lognormal(O.punter?.gross ?? L.puntGross, PARAMS.sigma.punt));
    if (O.punter) ev.actors.kicker = O.punter.player.id;
    const landing = yl + gross;
    ev.kickDistance = Math.min(gross, 100 - yl + 3);
    const who = O.punter ? `Punt ${O.punter.player.name}` : 'Punt';
    if (landing >= 100) {
      ev.outcome = 'punt_touchback';
      ev.yards = 100 - yl;
      ev.endYardLine = 100;
      ev.text = `${who} – Touchback`;
      emit(ev);
      changePossession(PARAMS.rules.puntTouchback);
      return;
    }
    ev.chances.push({ label: 'Punt Return', p: R.puntReturnRate, basis: `${R.team.abbr}: Returns pro gegnerischem Punt 2026` });
    let ret = 0;
    if (rng.chance(R.puntReturnRate)) {
      const returner = R.puntReturners.length ? R.puntReturners[rng.weighted(R.puntReturners.map((x) => x.weight))].player : null;
      if (returner) ev.actors.returner = returner.id;
      ev.chances.push({ label: 'Return-Touchdown', p: L.puntReturnTd, basis: 'Ligaschnitt 2026' });
      if (rng.chance(L.puntReturnTd)) {
        ev.outcome = 'punt_return_td';
        ev.yards = gross;
        ev.text = `${who} ${gross} Yards – Return-Touchdown${returner ? ` ${returner.name}` : ''}!`;
        off = R.team.id;
        touchdown(ev, off);
        return;
      }
      ret = Math.round(rng.lognormal(R.puntReturnAvg, PARAMS.sigma.puntReturn));
      ret = Math.min(ret, 100 - (100 - landing) - 1);
      ev.text = `${who} ${gross} Yards, Return${returner ? ` ${returner.name}` : ''} ${yd(ret)}`;
    } else {
      ev.text = `${who} ${gross} Yards`;
    }
    ev.yards = gross - ret;
    ev.endYardLine = clamp(landing - ret, 1, 99);
    emit(ev);
    changePossession(100 - landing + ret);
  };

  const penaltyCheck = (O: TeamProfile, D: TeamProfile): boolean => {
    const r = rng.next();
    const pO = O.penaltyPerSnap, pD = D.penaltyPerSnap;
    if (r >= pO + pD) return false;
    const offensive = r < pO;
    const P = offensive ? O : D;
    let yds = Math.max(5, Math.round(P.penaltyYds / 5) * 5);
    const ev: PlayEvent = { ...base('penalty', off), outcome: offensive ? 'penalty_offense' : 'penalty_defense', yards: 0, endYardLine: yl, text: '', chances: [] };
    ev.chances.push({ label: `Strafe ${P.team.abbr}`, p: offensive ? pO : pD, basis: `${P.team.abbr}: Strafen pro Snap 2026 · Ø ${P.penaltyYds.toFixed(1)} Yards` });
    if (offensive) {
      if (yl - yds < 1) yds = Math.floor(yl / 2);
      ev.yards = -yds;
      yl -= yds;
      dist += yds;
      ev.text = `Strafe gegen ${O.team.abbr}: ${yds} Yards zurück`;
    } else {
      if (yl + yds > 99) yds = Math.floor((100 - yl) / 2);
      ev.yards = yds;
      yl += yds;
      dist -= yds;
      ev.text = `Strafe gegen ${D.team.abbr}: ${yds} Yards`;
      if (dist <= 0) { setFirstDown(yl); ev.firstDown = true; ev.text += ' – First Down'; }
    }
    ev.endYardLine = yl;
    emit(ev);
    return true;
  };

  /** 4th Down und Kicks am Halbzeitende (Simulationsregel – die Bögen enthalten keine Situationsdaten). */
  const decide = (O: TeamProfile): 'play' | 'punt' | 'fg' => {
    const fgDist = 100 - yl + PARAMS.fg.snapAndHold;
    const maxFg = O.kicker?.maxDistance ?? PARAMS.fg.minMaxDistance;
    const diff = score[off] - score[other(off)];
    const endOfHalf = (q === 2 || q === 4) && clock <= 12;
    if (endOfHalf && fgDist <= maxFg && (q === 2 || (diff >= -3 && diff <= 0))) return 'fg';
    if (down < 4) return 'play';
    const desperate = q === 4 && clock <= 300 && diff < -3;
    if (desperate) return 'play';
    if (q === 4 && clock <= 300 && diff >= -3 && diff <= 0 && fgDist <= maxFg) return 'fg';
    const F = PARAMS.fourth;
    const inFgRange = fgDist <= maxFg;
    let x = logit(O.goRate4th) + F.base - F.perYard * (dist - 2);
    if (yl < F.ownTerritoryLine) x -= F.ownTerritory;
    if (inFgRange && dist > 2) x -= F.fgRange;
    const pGo = sigmoid(x);
    fourthChance = { label: '4th Down ausspielen', p: pGo, basis: `${O.team.abbr}: geht in ${pct(O.goRate4th)} der 4th Downs drauf (2026) · angepasst an Distanz/Feldposition (Simulationsregel)` };
    if (rng.chance(pGo)) return 'play';
    return inFgRange ? 'fg' : 'punt';
  };
  let fourthChance: Chance | null = null;

  // ── Spielablauf ──
  const tick = (sec: number) => {
    clock -= sec;
    if (clock > 0) return;
    if (q === 4) { over = true; return; }
    q++;
    clock = Q;
    if (q === 3) next = { kind: 'kickoff', team: firstReceiver }; // zweite Halbzeit: das andere Team kickt
  };

  let guard = 0;
  while (!over && guard++ < 1000) {
    const before = events.length;
    if (next.kind === 'kickoff') {
      kickoff(next.team, next.free);
    } else {
      const O = T(off), D = T(other(off));
      if (!penaltyCheck(O, D)) {
        fourthChance = null;
        const choice = decide(O);
        if (choice === 'fg') fieldGoal(O);
        else if (choice === 'punt') punt(O);
        else {
          const fourth = down === 4;
          const pr = passRateNow(O);
          if (rng.chance(pr)) passPlay(O, D, pr); else runPlay(O, D, pr);
          if (fourth && events.length > before) events[before].key = true; // 4th-Down-Versuch
        }
        const fc = fourthChance as Chance | null; // wird in decide() gesetzt
        if (fc && events.length > before) events[before].chances.unshift(fc);
      }
    }
    const elapsed = events.slice(before).reduce((x, e) => x + e.elapsed, 0);
    tick(elapsed);
  }

  return { seed: opts.seed, home: opts.home, away: opts.away, score, events, box, team: teamStats };
}

export type { Chance, Outcome };

/**
 * Simulationsparameter – alles, was NICHT direkt aus den Statistikbögen 2026 stammt.
 *
 * Diese Werte sind Modellannahmen, keine Spielerstatistiken. Sie stehen gesammelt hier, damit sie
 * sichtbar, prüfbar und per Rücktest (npm run backtest) einstellbar sind. Alle Spieler- und Teamwerte
 * selbst werden in model.ts aus den Bögen berechnet.
 */
export const PARAMS = {
  /**
   * Shrinkage (Empirical Bayes): Jede Quote wird als (Ereignisse + k · Liga) / (Versuche + k) berechnet.
   * k = „Pseudo-Versuche“ Ligadurchschnitt. Kleine Stichproben bleiben nahe am Schnitt, große behalten
   * ihren Unterschied.
   */
  k: {
    passRate: 100,      // Spielzüge
    sack: 150,          // Dropbacks
    cmpTeam: 150,       // Passversuche (Defense: zugelassen)
    intTeam: 300,
    qbCmp: 100,
    qbInt: 250,
    qbYpc: 60,          // Completions
    recCatch: 40,       // Targets
    recYpr: 30,         // Receptions
    recDrop: 20,        // nicht gefangene Targets
    defYpr: 80,
    ypcCarrier: 40,     // Läufe
    ypcDef: 120,
    tfl: 150,
    fumble: 120,        // Ballkontakte
    pbu: 60,
    fg: 10,             // FG-Versuche
    pat: 20,
    punt: 10,
    returns: 15,
    koTouchback: 30,
    twoPt: 20,
  },

  /**
   * Gewichte beim Zusammenführen (Log-Odds): Completion-Quote des QB und Fangquote des Receivers messen
   * teilweise dieselben Würfe, deshalb jeweils < 1, damit nichts doppelt zählt.
   */
  w: { qbCmp: 0.6, recCatch: 0.6, defCmp: 1, qbInt: 1, defInt: 1, sackO: 1, sackD: 1, tflO: 1, tflD: 1 },

  /** Exponenten beim Zusammenführen von Yard-Mittelwerten (multiplikativ relativ zur Liga). */
  e: { passRec: 0.7, passDef: 0.7, passQb: 0.3, runCarrier: 0.8, runDef: 0.8 },

  /**
   * Form der Yard-Verteilung (Lognormal, Log-Skala). Die Bögen enthalten nur Summen und Längste,
   * nicht die Länge jedes Spielzugs – die Form ist daher angenommen und wird im Rücktest gegen die
   * echten „Longest“-Werte pro Team-Spiel geprüft.
   */
  sigma: { pass: 0.95, run: 1.0, loss: 0.5, sack: 0.35, intReturn: 1.0, kickReturn: 0.55, puntReturn: 0.9, punt: 0.18, airDepth: 0.7 },

  /**
   * Ausgleich der Feldbegrenzung: Die echten Durchschnitte (Yards pro Lauf/Catch) enthalten bereits, dass
   * lange Spielzüge an der Goal Line enden. Damit die simulierten Durchschnitte nach dem Abschneiden den
   * echten entsprechen, liegt der Mittelwert vor dem Abschneiden um diesen Faktor höher (im Rücktest eingestellt).
   */
  fieldLimit: { run: 1.04, pass: 1.13 },

  /** Direkte Aufeinandertreffen: Gewicht = n / (n + k), höchstens cap. Saisonwerte bleiben die Basis. */
  h2h: { kTargets: 40, kCarries: 40, kPasses: 60, cap: 0.25 },

  /** Pass-/Laufwahl: Verschiebung der Team-Passquote in Log-Odds je Situation (Simulationsregel). */
  situation: {
    /** gleicht aus, dass die Situationsregeln die Passquote im Schnitt verschieben (im Rücktest eingestellt) */
    base: -0.15,
    longYardage: 1.0,   // 3rd/4th & ≥ 7
    mediumThird: 0.5,   // 3rd & 3–6
    shortYardage: -0.8, // 2nd–4th & ≤ 2
    trailingLate: 0.8,  // 4. Viertel, ≥ 9 Punkte zurück
    leadingLate: -0.8,  // 4. Viertel, ≥ 9 Punkte vorn
    twoMinute: 0.6,     // letzte 2 Minuten einer Halbzeit, nicht vorn
  },

  /**
   * 4th Down: Grundlage ist die echte Go-for-it-Quote des Teams 2026 (4th-Down-Versuche ÷ alle
   * 4th-Down-Situationen = Versuche + Punts + FG-Versuche). Die Bögen sagen nicht, bei welcher Distanz
   * und Feldposition versucht wurde – diese Verschiebungen (Log-Odds) sind Simulationsregeln.
   * base gleicht aus, dass die Abzüge den Schnitt senken (im Rücktest eingestellt).
   */
  fourth: { base: 1.6, perYard: 0.3, ownTerritory: 1.2, ownTerritoryLine: 35, fgRange: 0.8, k: 20 },

  /** Field Goals: Treffer sinkt mit der Distanz (Log-Odds pro Yard). Kicker-Niveau aus den Bögen. */
  fg: { slopePerYard: 0.11, snapAndHold: 17, minMaxDistance: 40, maxDistance: 55, maxOverLongest: 3 },

  /** Spielregeln/Feld (GFL spielt nach NCAA-Regeln). */
  rules: {
    quarterSeconds: 12 * 60,
    kickoffTouchback: 25,
    puntTouchback: 20,
    /** Kickoff wird im Schnitt etwa an der 5-Yard-Linie aufgenommen (Annahme; die Bögen haben nur Return-Yards). */
    kickoffCatchSpot: 5,
    safetyKickBonus: 15,
    missedFgMinSpot: 20,
  },

  /** Uhr: Sekunden für Spielzüge, die die Uhr anhalten. Der Wert für laufende Uhr wird aus der Spielzuganzahl abgeleitet. */
  clock: { stopped: 6, special: 8 },
} as const;

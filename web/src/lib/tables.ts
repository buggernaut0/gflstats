/** Spaltensaetze fuer Statistiktabellen je Bereich (Saisontabellen, Spielprotokolle, Box Scores). */

export interface TableGroup {
  key: string;
  title: string;
  /** Kennzahlen-Schluessel aus lib/stats.ts */
  cols: string[];
  /** Feld, an dem man erkennt, dass ein Spieler in diesem Bereich aktiv war */
  activity: string[];
}

export const SEASON_TABLES: TableGroup[] = [
  { key: "passing", title: "Passing", cols: ["complete", "pass", "cmpPct", "passingyards", "ypa", "touchdownpass", "interception", "longestpass", "passYdsPg"], activity: ["pass"] },
  { key: "rushing", title: "Rushing", cols: ["run", "runyards", "ypc", "touchdownrun", "longestrun", "rushYdsPg", "fumbled", "fumbledandlost"], activity: ["run"] },
  { key: "receiving", title: "Receiving", cols: ["catched", "receivingyards", "ypr", "touchdowncatch", "longestcatch", "recYdsPg", "yac", "droppedpass"], activity: ["catched", "intended"] },
  { key: "defense", title: "Defense", cols: ["tackletotal", "tackle", "tackleassist", "tackleforloss", "sacktotal", "intercepted", "brokenuppass", "forcedfumble", "qbhurrybydefense"], activity: ["tackletotal", "sacktotal", "intercepted", "brokenuppass"] },
  { key: "kicking", title: "Kicking und Punting", cols: ["fieldgoalgood", "fieldgoaltry", "fgPct", "longestfieldgoal", "patkickgood", "patkick", "punt", "puntAvg", "longestpunt"], activity: ["fieldgoalgood", "patkickgood", "punt", "kickoff", "fieldgoaltry"] },
  { key: "returns", title: "Returns", cols: ["kickoffreturn", "kickoffreturnyards", "krAvg", "kickoffreturntouchdown", "puntreturn", "puntreturnyards", "prAvg", "puntreturntouchdown"], activity: ["kickoffreturn", "puntreturn"] },
];

/** Kompakte Spalten fuer das Spielprotokoll je Rolle. */
export const GAMELOG_COLS: Record<string, string[]> = {
  QB: ["complete", "pass", "passingyards", "touchdownpass", "interception", "run", "runyards", "touchdownrun"],
  RB: ["run", "runyards", "touchdownrun", "longestrun", "catched", "receivingyards", "touchdowncatch"],
  "WR/TE": ["catched", "receivingyards", "touchdowncatch", "longestcatch", "run", "runyards"],
  DEF: ["tackletotal", "tackleforloss", "sacktotal", "intercepted", "brokenuppass", "forcedfumble"],
  K: ["fieldgoalgood", "fieldgoaltry", "longestfieldgoal", "patkickgood", "points"],
  P: ["punt", "puntyards", "longestpunt", "puntinside20"],
  default: ["passingyards", "runyards", "receivingyards", "tackletotal", "sacktotal", "touchdown"],
};

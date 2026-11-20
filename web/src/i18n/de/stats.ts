/**
 * Kennzahlen, Rollen und Positionsgruppen. Die deutschen Kennzahl-Namen stehen im Katalog selbst
 * (lib/stats.ts, config/fields.json) – hier nur der Zugriff, damit es keine zweite Quelle gibt.
 */
type Def = { key: string; label: string; abbr: string; formula?: string; qualifier?: { field: string; min: number; label: string } };

export const stats = {
  label: (d: Def) => d.label,
  abbr: (d: Def) => d.abbr,
  formula: (d: Def) => d.formula ?? "",
  qualifier: (q: { field: string; min: number; label: string }) => q.label,
  groups: {
    passing: "Passing",
    rushing: "Rushing",
    receiving: "Receiving",
    defense: "Defense",
    kicking: "Kicking",
    returns: "Returns",
    scoring: "Punkte und Strafen",
    derived: "Berechnet",
  } as Record<string, string>,
  roles: {
    QB: "Quarterback",
    RB: "Running Back",
    "WR/TE": "Receiver (WR/TE)",
    DEF: "Defense",
    K: "Kicker",
    P: "Punter",
  } as Record<string, string>,
  /** Positionsgruppen (Kader, Trap View): Kurzform bleibt englisch (QB, WR …), Langform übersetzt */
  positions: {
    QB: "Quarterback",
    RB: "Running Back",
    WR: "Wide Receiver",
    TE: "Tight End",
    REC: "Receiver (WR/TE)",
    OL: "Offensive Line",
    DL: "Defensive Line",
    LB: "Linebacker",
    DB: "Defensive Back",
    DEF: "Verteidiger",
    K: "Kicker",
    P: "Punter",
  } as Record<string, string>,
  maxValue: "Höchstwert",
  lowerIsBetter: "niedrig ist gut",
};

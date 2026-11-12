/**
 * Team-Kennzahlen je Saison mit Liga-Rang. Punkte aus den Endstaenden, Yards und Defense
 * aus der Summe der Spielerwerte, 3rd/4th Down und Red Zone aus den Teamstatistiken je Spiel.
 */
import type { Game, Scope, TeamSeason } from "./types";

export interface TeamMetricDef {
  key: string;
  label: string;
  abbr: string;
  decimals: number;
  lowerIsBetter?: boolean;
  unit?: string;
  formula: string;
  /** erst ab dieser Saison erfasst */
  since?: number;
  /** beschreibend, kein "besser/schlechter": kein Rang */
  neutral?: boolean;
}

export const TEAM_METRICS: TeamMetricDef[] = [
  { key: "ppg", label: "Punkte pro Spiel", abbr: "Pkt/Sp", decimals: 1, formula: "Erzielte Punkte / Spiele" },
  { key: "papg", label: "Zugelassene Punkte pro Spiel", abbr: "Geg/Sp", decimals: 1, lowerIsBetter: true, formula: "Zugelassene Punkte / Spiele" },
  { key: "ydsPg", label: "Yards pro Spiel", abbr: "Yds/Sp", decimals: 1, formula: "(Passing + Rushing Yards) / Spiele" },
  { key: "passYdsPg", label: "Passing Yards pro Spiel", abbr: "PaY/Sp", decimals: 1, formula: "Passing Yards / Spiele" },
  { key: "rushYdsPg", label: "Rushing Yards pro Spiel", abbr: "RuY/Sp", decimals: 1, formula: "Rushing Yards / Spiele" },
  { key: "allowedYdsPg", label: "Zugelassene Yards pro Spiel", abbr: "GegYds/Sp", decimals: 1, lowerIsBetter: true, formula: "Yards der Gegner / Spiele" },
  { key: "allowedPassPg", label: "Zugelassene Passing Yards pro Spiel", abbr: "GegPa/Sp", decimals: 1, lowerIsBetter: true, formula: "Passing Yards der Gegner / Spiele" },
  { key: "allowedRushPg", label: "Zugelassene Rushing Yards pro Spiel", abbr: "GegRu/Sp", decimals: 1, lowerIsBetter: true, formula: "Rushing Yards der Gegner / Spiele" },
  { key: "tdPg", label: "Touchdowns pro Spiel", abbr: "TD/Sp", decimals: 2, formula: "Touchdowns aller Spieler / Spiele" },
  { key: "sacksPg", label: "Sacks pro Spiel", abbr: "Sck/Sp", decimals: 2, formula: "Sacks der Defense / Spiele" },
  { key: "takeawaysPg", label: "Interceptions der Defense pro Spiel", abbr: "INT/Sp", decimals: 2, formula: "Interceptions der Defense / Spiele" },
  { key: "giveawaysPg", label: "Ballverluste pro Spiel", abbr: "TO/Sp", decimals: 2, lowerIsBetter: true, formula: "(Geworfene Interceptions + verlorene Fumbles) / Spiele" },
  { key: "thirdPct", label: "3rd-Down-Quote", abbr: "3rd%", decimals: 1, unit: "%", formula: "Erfolgreiche 3rd Downs / Versuche × 100 (Teamstatistik je Spiel)" },
  { key: "thirdPctAllowed", label: "3rd-Down-Quote der Gegner", abbr: "Geg 3rd%", decimals: 1, unit: "%", lowerIsBetter: true, formula: "3rd Downs der Gegner: erfolgreich / Versuche × 100" },
  { key: "redzonePct", label: "Red-Zone-TD-Quote", abbr: "RZ TD%", decimals: 1, unit: "%", since: 2025, formula: "Touchdowns / Red-Zone-Besuche × 100 (ab 2025 erfasst)" },
  { key: "runShare", label: "Laufanteil", abbr: "Lauf%", decimals: 1, unit: "%", neutral: true, formula: "Laufversuche / (Lauf- + Passversuche) × 100 (Teamstatistik je Spiel)" },
];

export interface TeamSeasonMetrics {
  team: string;
  season: number;
  scope: Scope;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  values: Record<string, number | null>;
}

const r = (a: number, b: number, f = 1) => (b > 0 ? (a / b) * f : null);

export function teamSeasonMetrics(ts: TeamSeason[], games: Game[]): TeamSeasonMetrics[] {
  // Teamstatistiken je Spiel aufsummieren (Saison x Team x Phase)
  const agg = new Map<string, Record<string, number>>();
  for (const g of games) {
    for (const [team, opp] of [[g.home, g.away], [g.away, g.home]]) {
      const own = g.teamStats[team] ?? {};
      const their = g.teamStats[opp] ?? {};
      for (const scope of ["all", g.type] as Scope[]) {
        const k = `${team}|${g.season}|${scope}`;
        const a = agg.get(k) ?? {};
        const add = (key: string, x: number | undefined) => {
          if (x !== undefined) a[key] = (a[key] ?? 0) + x;
        };
        add("thirdAtt", own.thirdAtt);
        add("thirdConv", own.thirdConv);
        add("oppThirdAtt", their.thirdAtt);
        add("oppThirdConv", their.thirdConv);
        add("redzone", own.redzone);
        add("redzoneTd", own.redzoneTd);
        add("rushAtt", own.rushAtt);
        add("passAtt", own.passAtt);
        agg.set(k, a);
      }
    }
  }
  return ts.map((t) => {
    const o = t.offense;
    const d = t.defenseAllowed;
    const a = agg.get(`${t.team}|${t.season}|${t.scope}`) ?? {};
    const yds = (o.passingyards ?? 0) + (o.runyards ?? 0);
    const allowed = (d.passingyards ?? 0) + (d.runyards ?? 0);
    return {
      team: t.team, season: t.season, scope: t.scope, games: t.games, wins: t.wins, losses: t.losses, ties: t.ties,
      pointsFor: t.pointsFor, pointsAgainst: t.pointsAgainst,
      values: {
        ppg: r(t.pointsFor, t.games),
        papg: r(t.pointsAgainst, t.games),
        ydsPg: r(yds, t.games),
        passYdsPg: r(o.passingyards ?? 0, t.games),
        rushYdsPg: r(o.runyards ?? 0, t.games),
        allowedYdsPg: r(allowed, t.games),
        allowedPassPg: r(d.passingyards ?? 0, t.games),
        allowedRushPg: r(d.runyards ?? 0, t.games),
        tdPg: r(o.touchdown ?? 0, t.games),
        sacksPg: r(o.sacktotal ?? 0, t.games),
        takeawaysPg: r(o.intercepted ?? 0, t.games),
        giveawaysPg: r((o.interception ?? 0) + (o.fumbledandlost ?? 0), t.games),
        thirdPct: r(a.thirdConv ?? 0, a.thirdAtt ?? 0, 100),
        thirdPctAllowed: r(a.oppThirdConv ?? 0, a.oppThirdAtt ?? 0, 100),
        redzonePct: t.season >= 2025 ? r(a.redzoneTd ?? 0, a.redzone ?? 0, 100) : null,
        runShare: r(a.rushAtt ?? 0, (a.rushAtt ?? 0) + (a.passAtt ?? 0), 100),
      },
    };
  });
}

/** Liga-Rang (1 = bestes Team) einer Kennzahl unter allen Teams derselben Saison und Phase. */
export function teamRank(all: TeamSeasonMetrics[], row: TeamSeasonMetrics, key: string): { rank: number; of: number } | null {
  const def = TEAM_METRICS.find((m) => m.key === key)!;
  const x = row.values[key];
  if (x === null || x === undefined || def.neutral) return null;
  const peers = all.filter((t) => t.season === row.season && t.scope === row.scope && t.values[key] !== null);
  const better = peers.filter((t) => (def.lowerIsBetter ? t.values[key]! < x : t.values[key]! > x)).length;
  return { rank: better + 1, of: peers.length };
}

export function fmtMetric(def: TeamMetricDef, x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "–";
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: def.decimals, maximumFractionDigits: def.decimals }).format(x) + (def.unit === "%" ? " %" : "");
}

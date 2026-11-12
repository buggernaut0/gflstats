/**
 * Berechnungen fuer die Startseite einer Saison. Reine Funktionen: Eingabe sind die
 * Daten aus public/data, Ausgabe sind kleine, serialisierbare Objekte fuer die Anzeige.
 * Jede Zahl ist entweder eine Summe aus den Spielboegen ("Original") oder eine hier
 * dokumentierte Rechnung ("Berechnet").
 */
import type { Game, Player, PlayerGame, PlayerSeason, Scope, Team, TeamSeason } from "./types";

export interface LeaderCategory {
  key: string;      // Statistikfeld der Quelle
  title: string;
  unit: string;
}

/** Kategorien der League-Leaders-Uebersicht auf der Startseite. */
export const DASHBOARD_CATEGORIES: LeaderCategory[] = [
  { key: "passingyards", title: "Passing Yards", unit: "Yds" },
  { key: "touchdownpass", title: "Passing Touchdowns", unit: "TD" },
  { key: "runyards", title: "Rushing Yards", unit: "Yds" },
  { key: "touchdownrun", title: "Rushing Touchdowns", unit: "TD" },
  { key: "receivingyards", title: "Receiving Yards", unit: "Yds" },
  { key: "catched", title: "Receptions", unit: "Rec" },
  { key: "touchdowncatch", title: "Receiving Touchdowns", unit: "TD" },
  { key: "tackletotal", title: "Tackles", unit: "Tkl" },
  { key: "sacktotal", title: "Sacks", unit: "Sck" },
  { key: "intercepted", title: "Interceptions", unit: "INT" },
];

export interface LeaderRow {
  rank: number;
  tied: boolean;
  player: string;
  name: string;
  teams: string[];
  value: number;
  games: number;
}

/**
 * Rangliste mit geteilten Plaetzen (1, 2, 2, 4). Gemeinsame Eintraege zweier Spieler
 * ("Anna Muster / Max Beispiel") werden nicht gewertet.
 */
export function leaders(
  seasons: PlayerSeason[],
  players: Map<string, Player>,
  season: number,
  scope: Scope,
  field: string,
  limit = 5,
): LeaderRow[] {
  const rows = seasons
    .filter((s) => s.season === season && s.scope === scope && (s.stats[field] ?? 0) > 0)
    .filter((s) => !players.get(s.player)?.shared)
    .map((s) => ({ player: s.player, value: s.stats[field], teams: s.teams, games: s.games }))
    .sort((a, b) => b.value - a.value || a.player.localeCompare(b.player));
  const out: LeaderRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const rank = i > 0 && rows[i].value === rows[i - 1].value ? out[i - 1].rank : i + 1;
    if (rank > limit) break;
    out.push({ ...rows[i], rank, tied: false, name: players.get(rows[i].player)?.name ?? rows[i].player });
  }
  for (const r of out) r.tied = out.filter((x) => x.rank === r.rank).length > 1;
  return out.slice(0, limit + 2);
}

export interface TeamRow {
  team: string;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  ppg: number;
  papg: number;
  yardsPg: number;
  yardsAllowedPg: number;
}

/** Teamtabelle: Bilanz und Punkte aus den Endstaenden, Yards aus der Summe der Spielerstatistiken. */
export function teamTable(teamSeasons: TeamSeason[], season: number, scope: Scope): TeamRow[] {
  return teamSeasons
    .filter((t) => t.season === season && t.scope === scope)
    .map((t) => {
      const yds = (t.offense.passingyards ?? 0) + (t.offense.runyards ?? 0);
      const allowed = (t.defenseAllowed.passingyards ?? 0) + (t.defenseAllowed.runyards ?? 0);
      return {
        team: t.team,
        games: t.games,
        wins: t.wins,
        losses: t.losses,
        ties: t.ties,
        winPct: (t.wins + t.ties / 2) / t.games,
        pointsFor: t.pointsFor,
        pointsAgainst: t.pointsAgainst,
        diff: t.pointsFor - t.pointsAgainst,
        ppg: t.pointsFor / t.games,
        papg: t.pointsAgainst / t.games,
        yardsPg: yds / t.games,
        yardsAllowedPg: allowed / t.games,
      };
    })
    .sort((a, b) => b.winPct - a.winPct || b.diff - a.diff || a.team.localeCompare(b.team));
}

export interface FinalGame {
  id: string;
  label: string;
  date: string;
  winner: { team: string; score: number };
  loser: { team: string; score: number };
}

/** Finale = Playoff-Spiel mit "Bowl" im Namen, sonst das letzte Playoff-Spiel der Saison. */
export function seasonFinal(games: Game[], season: number): FinalGame | null {
  const playoffs = games.filter((g) => g.season === season && g.type === "playoff").sort((a, b) => a.date.localeCompare(b.date));
  if (!playoffs.length) return null;
  const g = playoffs.find((x) => /bowl/i.test(x.name)) ?? playoffs[playoffs.length - 1];
  const homeWon = g.homeScore >= g.awayScore;
  return {
    id: g.id,
    label: /bowl/i.test(g.name) ? "GFL Bowl" : "Finale",
    date: g.date,
    winner: { team: homeWon ? g.home : g.away, score: homeWon ? g.homeScore : g.awayScore },
    loser: { team: homeWon ? g.away : g.home, score: homeWon ? g.awayScore : g.homeScore },
  };
}

/** Playoff-Runde, soweit der Spielname der Quelle sie nennt (sonst undefined, nichts wird geraten). */
export function playoffRound(g: Pick<Game, "type" | "name">): string | undefined {
  if (g.type !== "playoff") return undefined;
  if (/bowl/i.test(g.name)) return "GFL Bowl";
  if (/halbfinal/i.test(g.name)) return "Halbfinale";
  if (/viertelfinal/i.test(g.name)) return "Viertelfinale";
  if (/relegation/i.test(g.name)) return "Relegation";
  return undefined;
}

/**
 * Spiele einer Saison mit Highlight-Video fuer die Startseite: zuerst Playoffs (spaeteste zuerst),
 * dann die knappsten Spiele der Regular Season (bei gleichem Abstand das punktereichere).
 */
export function seasonHighlights(games: Game[], season: number, limit = 3): Game[] {
  const withVideo = games.filter((g) => g.season === season && g.video);
  const margin = (g: Game) => Math.abs(g.homeScore - g.awayScore);
  const playoffs = withVideo.filter((g) => g.type === "playoff").sort((a, b) => b.date.localeCompare(a.date));
  const regular = withVideo
    .filter((g) => g.type !== "playoff")
    .sort((a, b) => margin(a) - margin(b) || b.homeScore + b.awayScore - (a.homeScore + a.awayScore) || a.date.localeCompare(b.date));
  return [...playoffs, ...regular].slice(0, limit);
}

export interface SeasonFacts {
  games: number;
  regular: number;
  playoff: number;
  teams: number;
  players: number;
  pointsPerGame: number;
}

export function seasonFacts(games: Game[], seasons: PlayerSeason[], teams: TeamSeason[], season: number): SeasonFacts {
  const g = games.filter((x) => x.season === season);
  const pts = g.reduce((sum, x) => sum + x.homeScore + x.awayScore, 0);
  return {
    games: g.length,
    regular: g.filter((x) => x.type === "regular").length,
    playoff: g.filter((x) => x.type === "playoff").length,
    teams: new Set(teams.filter((t) => t.season === season && t.scope === "regular").map((t) => t.team)).size,
    players: seasons.filter((s) => s.season === season && s.scope === "all").length,
    pointsPerGame: g.length ? pts / g.length : 0,
  };
}

export interface GamePerformance {
  field: string;
  title: string;
  player: string;
  name: string;
  team: string;
  opponent: string;
  date: string;
  gameId: string;
  value: number;
  extra: string;
}

const PERFORMANCE_FIELDS: { field: string; title: string; extra?: (s: Record<string, number>) => string }[] = [
  { field: "passingyards", title: "Passing Yards", extra: (s) => `${s.complete ?? 0}/${s.pass ?? 0}, ${s.touchdownpass ?? 0} TD` },
  { field: "runyards", title: "Rushing Yards", extra: (s) => `${s.run ?? 0} Carries, ${s.touchdownrun ?? 0} TD` },
  { field: "receivingyards", title: "Receiving Yards", extra: (s) => `${s.catched ?? 0} Rec, ${s.touchdowncatch ?? 0} TD` },
  { field: "touchdownpass", title: "Passing Touchdowns", extra: (s) => `${s.passingyards ?? 0} Yds` },
  { field: "tackletotal", title: "Tackles" },
  { field: "sacktotal", title: "Sacks" },
];

/** Beste Einzelleistung je Kategorie; bei Gleichstand gewinnt das fruehere Spiel. */
export function topPerformances(
  rows: PlayerGame[],
  games: Map<string, Game>,
  players: Map<string, Player>,
  scope: Scope,
): GamePerformance[] {
  const out: GamePerformance[] = [];
  for (const def of PERFORMANCE_FIELDS) {
    let best: PlayerGame | null = null;
    for (const r of rows) {
      const g = games.get(r.g);
      if (!g || (scope !== "all" && g.type !== scope) || players.get(r.p)?.shared) continue;
      const v = r.s[def.field] ?? 0;
      if (v <= 0) continue;
      const bv = best ? best.s[def.field] ?? 0 : -1;
      if (v > bv || (v === bv && best && g.date < games.get(best.g)!.date)) best = r;
    }
    if (!best) continue;
    const g = games.get(best.g)!;
    out.push({
      field: def.field,
      title: def.title,
      player: best.p,
      name: players.get(best.p)?.name ?? best.p,
      team: best.t,
      opponent: best.t === g.home ? g.away : g.home,
      date: g.date,
      gameId: g.id,
      value: best.s[def.field],
      extra: def.extra ? def.extra(best.s) : "",
    });
  }
  return out;
}

export type TeamLite = Pick<Team, "id" | "name" | "short" | "abbr" | "colors" | "logo">;

/** Kompakte Teamdaten fuer die Oberflaeche; name = Name in der betrachteten Saison, falls angegeben. */
export function toTeamLite(t: Team, name?: string): TeamLite {
  return { id: t.id, name: name ?? t.name, short: t.short, abbr: t.abbr, colors: t.colors, logo: t.logo ?? null };
}

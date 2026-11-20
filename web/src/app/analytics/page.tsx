import AnalyticsHub from "@/components/AnalyticsHub";
import { DASHBOARD_CATEGORIES, leaders, toTeamLite, type TeamLite } from "@/lib/dashboard";
import { gameMap, getMeta, getPlayerGames, getPlayerSeasons, getPlayers, getTeams, isAvailable, playerMap, teamNameIn } from "@/lib/data";
import { breakouts, gameRecords } from "@/lib/insights";
import { allEntries } from "@/lib/serverCache";

export const metadata = { title: "Analytics" };

/** Vorschau-Kategorien der Ranglisten; volle Auswahl auf /leaders/. */
const PREVIEW_CATEGORIES = ["passingyards", "runyards", "tackletotal"];
const PREVIEW_RECORDS = ["passingyards", "runyards", "receivingyards", "tackletotal"];

export default function AnalyticsPage() {
  const meta = getMeta();
  const season = meta.currentSeason;
  const players = playerMap();
  const games = gameMap();
  const teams: Record<string, TeamLite> = Object.fromEntries(getTeams().map((t) => [t.id, toTeamLite(t, teamNameIn(t, season))]));
  const ps = getPlayerSeasons();
  const names = Object.fromEntries(getPlayers().map((p) => [p.id, p.name]));

  const categories = DASHBOARD_CATEGORIES.filter((c) => PREVIEW_CATEGORIES.includes(c.key));
  const pgRows = meta.seasons.flatMap((s) => getPlayerGames(s));
  const records = PREVIEW_RECORDS.map((f) => ({ field: f, top: gameRecords(pgRows, games, players, f, 1)[0] })).filter((r) => r.top);
  const topBreakouts = meta.seasons.includes(season - 1) ? breakouts(allEntries(), season, meta.availability).slice(0, 3) : [];

  return (
    <AnalyticsHub
      season={season}
      firstSeason={meta.seasons[0]}
      leaders={categories.map((c) => ({ category: c, rows: leaders(ps, players, season, "all", c.key, 3).slice(0, 3), unavailable: !isAvailable(c.key, season) }))}
      records={records.map((r) => ({ field: r.field, top: { player: r.top.player, team: r.top.team, game: r.top.game, date: r.top.date, season: r.top.season, opponent: r.top.opponent, value: r.top.value } }))}
      breakouts={topBreakouts}
      names={names}
      teams={teams}
    />
  );
}

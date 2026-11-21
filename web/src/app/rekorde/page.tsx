import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import RecordsView, { type RecordItem } from "@/components/RecordsView";
import { toTeamLite, type TeamLite } from "@/lib/dashboard";
import { gameMap, getMeta, getPlayerGames, getTeams, playerMap } from "@/lib/data";
import { T } from "@/i18n/react";
import { RECORD_FIELDS, careerRecords, gameRecords, seasonRecords } from "@/lib/insights";
import { allEntries } from "@/lib/serverCache";

export const metadata = { title: "Rekorde" };

export default function RecordsPage() {
  const meta = getMeta();
  const players = playerMap();
  const games = gameMap();
  const teamsList = getTeams();
  const teams: Record<string, TeamLite> = Object.fromEntries(teamsList.map((t) => [t.id, toTeamLite(t)]));
  const rows = meta.seasons.flatMap((s) => getPlayerGames(s));
  const shared = new Set([...players.values()].filter((p) => p.shared).map((p) => p.id));
  const entries = allEntries().filter((e) => !shared.has(e.player));
  const name = (id: string) => players.get(id)?.name ?? id;

  const data: Record<"game" | "season" | "career", Record<string, RecordItem[]>> = { game: {}, season: {}, career: {} };
  for (const f of RECORD_FIELDS) {
    data.game[f] = gameRecords(rows, games, players, f, 5).map((r) => ({
      player: r.player, name: name(r.player), teams: [r.team], value: r.value,
      note: { kind: "game", date: r.date, season: r.season, opp: teams[r.opponent]?.abbr ?? r.opponent }, href: `/spiele/${r.game}/`,
    }));
    data.season[f] = seasonRecords(entries, f, 5).map((r) => ({ player: r.player, name: name(r.player), teams: r.teams, value: r.value, note: { kind: "season", season: r.season, games: r.games } }));
    data.career[f] = careerRecords(entries, f, 5).map((r) => ({
      player: r.player, name: name(r.player), teams: [...new Set(players.get(r.player)?.seasons.flatMap((s) => s.teams))], value: r.value,
      note: { kind: "career", seasons: r.seasons.length, games: r.games },
    }));
  }

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-8">
      <AnalyticsCrumb current="analytics.recordsPage" />
      <h1 className="display text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[64px]"><T k="analytics.recordsPage" /></h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2">
        <T k="analytics.recordsIntro" a={[meta.seasons[0]]} />
      </p>
      <RecordsView data={data} teams={teams} />
    </main>
  );
}

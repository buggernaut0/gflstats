import RecordsView, { type RecordItem } from "@/components/RecordsView";
import type { TeamLite } from "@/lib/dashboard";
import { gameMap, getMeta, getPlayerGames, getTeams, playerMap } from "@/lib/data";
import { fmtShortDate } from "@/lib/format";
import { RECORD_FIELDS, careerRecords, gameRecords, seasonRecords } from "@/lib/insights";
import { allEntries } from "@/lib/serverCache";

export const metadata = { title: "Rekorde" };

export default function RecordsPage() {
  const meta = getMeta();
  const players = playerMap();
  const games = gameMap();
  const teamsList = getTeams();
  const teams: Record<string, TeamLite> = Object.fromEntries(teamsList.map((t) => [t.id, { id: t.id, name: t.name, short: t.short, abbr: t.abbr, colors: t.colors }]));
  const rows = meta.seasons.flatMap((s) => getPlayerGames(s));
  const shared = new Set([...players.values()].filter((p) => p.shared).map((p) => p.id));
  const entries = allEntries().filter((e) => !shared.has(e.player));
  const name = (id: string) => players.get(id)?.name ?? id;

  const data: Record<"game" | "season" | "career", Record<string, RecordItem[]>> = { game: {}, season: {}, career: {} };
  for (const f of RECORD_FIELDS) {
    data.game[f] = gameRecords(rows, games, players, f, 5).map((r) => ({
      player: r.player, name: name(r.player), teams: [r.team], value: r.value,
      note: `${fmtShortDate(r.date)}${r.season} gegen ${teams[r.opponent]?.abbr ?? r.opponent}`, href: `/spiele/${r.game}/`,
    }));
    data.season[f] = seasonRecords(entries, f, 5).map((r) => ({ player: r.player, name: name(r.player), teams: r.teams, value: r.value, note: `Saison ${r.season}, ${r.games} Spiele` }));
    data.career[f] = careerRecords(entries, f, 5).map((r) => ({
      player: r.player, name: name(r.player), teams: [...new Set(players.get(r.player)?.seasons.flatMap((s) => s.teams))], value: r.value,
      note: `${r.seasons.length} ${r.seasons.length === 1 ? "Saison" : "Saisons"}, ${r.games} Spiele`,
    }));
  }

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink">Rekorde</h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2">
        Bestwerte seit {meta.seasons[0]}, dem Beginn der Daten: in einem Spiel, in einer Saison (Regular Season und Playoffs) und über die Karriere. Ältere Spielzeiten sind nicht
        erfasst, „Karriere“ heißt daher „seit {meta.seasons[0]}“. Bei Gleichstand steht das frühere Ereignis vorn.
      </p>
      <RecordsView data={data} teams={teams} />
    </main>
  );
}

import Link from "next/link";
import GameList from "@/components/GameList";
import { playoffRound, toTeamLite, type TeamLite } from "@/lib/dashboard";
import { getGames, getMeta, getTeams, teamMap, teamNameIn } from "@/lib/data";

export const metadata = { title: "Spiele" };

export default function GamesPage() {
  const meta = getMeta();
  const teams: Record<string, TeamLite> = Object.fromEntries(getTeams().map((t) => [t.id, toTeamLite(t)]));
  const tm = teamMap();
  const nameIn = (id: string, season: number) => (tm.get(id) ? teamNameIn(tm.get(id)!, season) : id);
  const games = getGames().map((g) => ({
    id: g.id, season: g.season, date: g.date, playoff: g.type === "playoff", round: playoffRound(g), home: g.home, away: g.away, homeScore: g.homeScore, awayScore: g.awayScore,
    homeName: nameIn(g.home, g.season), awayName: nameIn(g.away, g.season), video: !!g.video,
  }));
  const videos = games.filter((g) => g.video).length;
  return (
    <main className="mx-auto max-w-[1000px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink">Spiele</h1>
      <p className="mb-8 mt-3 max-w-[68ch] text-[14px] text-ink-2">
        Alle {games.length} Spiele mit Statistikbogen, Gastteam links, Heimteam rechts. Zu {videos} Spielen gibt es ein Highlight-Video (Symbol rechts). Einzelleistungen über alle Spiele hinweg findet die{" "}
        <Link href="/analytics/spiele/" className="text-accent-text underline-offset-4 hover:underline">Game Search</Link>.
      </p>
      <GameList games={games} seasons={meta.seasons} teams={teams} />
    </main>
  );
}

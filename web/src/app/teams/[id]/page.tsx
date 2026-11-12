import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FavBadge } from "@/components/FavoriteTeam";
import TeamLogo from "@/components/TeamLogo";
import { teamsAttr } from "@/lib/favorite";
import TeamView, { type RosterRow, type TeamSeasonView } from "@/components/TeamView";
import { toTeamLite, type TeamLite } from "@/lib/dashboard";
import { getGames, getPlayerGames, getTeamSeasons, getTeams, playerMap, teamMap, teamNameIn } from "@/lib/data";
import { TEAM_METRICS, teamRank, teamSeasonMetrics, type TeamSeasonMetrics } from "@/lib/team";
import { addStats } from "@/lib/stats";
import type { Scope } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return getTeams().map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: teamMap().get(id)?.name ?? "Team" };
}

let metricsCache: TeamSeasonMetrics[] | null = null;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = teamMap().get(id);
  if (!team) notFound();
  const games = getGames();
  const metrics = (metricsCache ??= teamSeasonMetrics(getTeamSeasons(), games));
  const players = playerMap();
  const seasonsOf = [...new Set(metrics.filter((m) => m.team === id).map((m) => m.season))].sort((a, b) => b - a);
  const latest = seasonsOf[0];
  const teams: Record<string, TeamLite> = Object.fromEntries(getTeams().map((t) => [t.id, toTeamLite(t, teamNameIn(t, latest))]));

  const views: TeamSeasonView[] = seasonsOf.map((season) => {
    const metric = (scope: Scope) => {
      const row = metrics.find((m) => m.team === id && m.season === season && m.scope === scope);
      if (!row) return null;
      return {
        games: row.games, wins: row.wins, losses: row.losses, ties: row.ties, values: row.values,
        ranks: Object.fromEntries(TEAM_METRICS.map((d) => [d.key, teamRank(metrics, row, d.key)])),
      };
    };
    const roster = new Map<string, RosterRow>();
    for (const r of getPlayerGames(season)) {
      if (r.t !== id) continue;
      const p = players.get(r.p)!;
      const e = roster.get(r.p) ?? { player: r.p, name: p.name, role: p.seasons.find((s) => s.season === season)?.role ?? null, games: 0, stats: {} };
      e.games += 1;
      addStats(e.stats, r.s);
      roster.set(r.p, e);
    }
    const schedule = games
      .filter((g) => g.season === season && (g.home === id || g.away === id))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((g) => {
        const home = g.home === id;
        return { id: g.id, date: g.date, playoff: g.type === "playoff", home, opponent: home ? g.away : g.home, teamScore: home ? g.homeScore : g.awayScore, oppScore: home ? g.awayScore : g.homeScore, name: g.name, video: !!g.video };
      });
    return {
      season,
      hasPlayoffs: schedule.some((g) => g.playoff),
      metrics: { all: metric("all"), regular: metric("regular"), playoff: metric("playoff") },
      // Nur die Felder, die die Kader-Tabelle zeigt (haelt die Seite klein)
      roster: [...roster.values()].map((r) => ({ ...r, stats: Object.fromEntries(Object.entries(r.stats).filter(([k]) => ["passingyards", "touchdownpass", "runyards", "touchdownrun", "catched", "receivingyards", "touchdowncatch", "tackletotal", "sacktotal", "intercepted"].includes(k))) })),
      schedule,
    };
  });

  const formerNames = Object.entries(team.namesBySeason).filter(([, n]) => n !== team.name);
  const record = (s: number) => metrics.find((m) => m.team === id && m.season === s && m.scope === "regular");

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <TeamLogo team={team} size={88} />
          <div>
            <h1 className="display text-[44px] font-bold leading-none tracking-tight text-ink sm:text-[56px]">{team.name}</h1>
            <span {...teamsAttr(team.id)} className="fav-plain block">
              <FavBadge className="mt-2.5" />
            </span>
            <p className="mt-2 text-[14px] text-ink-2">
              GFL-Saisons in den Daten: {[...seasonsOf].reverse().join(", ")}.
              {formerNames.length > 0 && <> Bis {formerNames[formerNames.length - 1][0]} als „{formerNames[0][1]}“ geführt.</>}
            </p>
            {team.logoPage && (
              <p className="mt-1 text-[12.5px] text-ink-3">
                Logo:{" "}
                <a href={team.logoPage} className="underline-offset-4 hover:text-ink hover:underline" rel="noopener">
                  offizielles Teamlogo, gfl.info
                </a>
              </p>
            )}
          </div>
        </div>
        <dl className="flex gap-6 text-[13.5px]">
          {[...seasonsOf].reverse().map((s) => {
            const r = record(s);
            return (
              <div key={s}>
                <dt className="num text-[12px] text-ink-3" title="Bilanz Regular Season">{s}</dt>
                <dd className="num display text-[20px] font-semibold text-ink">{r ? `${r.wins}–${r.losses}${r.ties ? `–${r.ties}` : ""}` : "–"}</dd>
              </div>
            );
          })}
        </dl>
      </section>
      {team.note && <p className="mb-6 max-w-[70ch] text-[13px] text-ink-3">{team.note}</p>}
      <TeamView seasons={views} teams={teams} />
    </main>
  );
}

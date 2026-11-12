import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TeamView, { type RosterRow, type TeamSeasonView } from "@/components/TeamView";
import type { TeamLite } from "@/lib/dashboard";
import { FIELDS, getGames, getPlayerGames, getTeamSeasons, getTeams, playerMap, teamMap, teamNameIn } from "@/lib/data";
import { TEAM_METRICS, teamRank, teamSeasonMetrics, type TeamSeasonMetrics } from "@/lib/team";
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
const MAX = new Set(FIELDS.filter((f) => f.agg === "max").map((f) => f.key));

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = teamMap().get(id);
  if (!team) notFound();
  const games = getGames();
  const metrics = (metricsCache ??= teamSeasonMetrics(getTeamSeasons(), games));
  const players = playerMap();
  const seasonsOf = [...new Set(metrics.filter((m) => m.team === id).map((m) => m.season))].sort((a, b) => b - a);
  const latest = seasonsOf[0];
  const teams: Record<string, TeamLite> = Object.fromEntries(getTeams().map((t) => [t.id, { id: t.id, name: teamNameIn(t, latest), short: t.short, abbr: t.abbr, colors: t.colors }]));

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
      for (const [k, v] of Object.entries(r.s)) e.stats[k] = MAX.has(k) ? Math.max(e.stats[k] ?? 0, v) : Math.round(((e.stats[k] ?? 0) + v) * 100) / 100;
      roster.set(r.p, e);
    }
    const schedule = games
      .filter((g) => g.season === season && (g.home === id || g.away === id))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((g) => {
        const home = g.home === id;
        return { id: g.id, date: g.date, playoff: g.type === "playoff", home, opponent: home ? g.away : g.home, teamScore: home ? g.homeScore : g.awayScore, oppScore: home ? g.awayScore : g.homeScore, name: g.name };
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
          <div
            className="display grid h-[88px] w-[88px] shrink-0 place-items-center rounded-2xl border border-line-strong bg-surface-2 text-[30px] font-bold text-ink"
            style={team.colors?.primary ? { boxShadow: `inset 0 -6px 0 ${team.colors.primary}` } : undefined}
            aria-hidden="true"
          >
            {team.abbr}
          </div>
          <div>
            <h1 className="display text-[44px] font-bold leading-none tracking-tight text-ink sm:text-[56px]">{team.name}</h1>
            <p className="mt-2 text-[14px] text-ink-2">
              GFL-Saisons in den Daten: {[...seasonsOf].reverse().join(", ")}.
              {formerNames.length > 0 && <> Bis {formerNames[formerNames.length - 1][0]} als „{formerNames[0][1]}“ geführt.</>}
            </p>
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

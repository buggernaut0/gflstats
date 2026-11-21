import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FavBadge } from "@/components/FavoriteTeam";
import LineupSection from "@/components/lineup/LineupSection";
import TeamLogo from "@/components/TeamLogo";
import SectionTabs from "@/components/SectionTabs";
import { contrast, luminance } from "@/lib/teamColors";
import { teamsAttr } from "@/lib/favorite";
import TeamView, { type RosterRow, type TeamSeasonView } from "@/components/TeamView";
import { toTeamLite, type TeamLite } from "@/lib/dashboard";
import SeasonNotice from "@/components/SeasonNotice";
import { T, Titled } from "@/i18n/react";
import { getGames, getMeta, getPlayerGames, getRosters, getTeamSeasons, getTeams, playerMap, teamMap, teamNameIn } from "@/lib/data";
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
      const ps = p.seasons.find((s) => s.season === season);
      // Rückennummer/Position nur aus dem offiziellen Kader dieses Teams in dieser Saison (players.json, build_data.py)
      const own = ps?.rosterTeam === id;
      const e = roster.get(r.p) ?? { player: r.p, name: p.name, role: ps?.role ?? null, number: own ? ps!.number! : null, position: own ? ps!.position ?? null : null, games: 0, stats: {} };
      e.games += 1;
      addStats(e.stats, r.s);
      roster.set(r.p, e);
    }
    // Spieler aus dem offiziellen Kader ohne Eintrag im Statistikbogen (v. a. Offensive Line): Name, Nummer, Position
    const official = getRosters()[String(season)]?.[id];
    for (const e of official?.players ?? []) {
      if (e.player) continue;
      roster.set(`kader:${e.number}:${e.name}`, { player: null, name: e.name, role: null, number: e.number, position: e.position, games: 0, stats: {} });
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
      rosterSource: official ? { url: official.source, retrieved: official.retrieved } : null,
      roster: [...roster.values()].map((r) => ({ ...r, stats: Object.fromEntries(Object.entries(r.stats).filter(([k]) => ["passingyards", "touchdownpass", "runyards", "touchdownrun", "catched", "receivingyards", "touchdowncatch", "tackletotal", "sacktotal", "intercepted"].includes(k))) })),
      schedule,
    };
  });

  const formerNames = Object.entries(team.namesBySeason).filter(([, n]) => n !== team.name);
  const record = (s: number) => metrics.find((m) => m.team === id && m.season === s && m.scope === "regular");

  // Kopf in den Teamfarben – nur mit belegten Farben aus curation/teams.json, sonst neutral (Navy)
  const primary = team.colors?.primary ?? null;
  const secondary = team.colors?.secondary ?? null;
  const band = primary ?? "var(--navy)";
  const onLight = primary ? luminance(primary) > 0.45 : false;
  const ink = onLight ? "#0b1a33" : "#ffffff";
  const soft = onLight ? "rgba(11,26,51,0.72)" : "rgba(255,255,255,0.78)";
  // Streifen unten: Zweitfarbe, sofern sie sich vom Band abhebt
  const stripe = secondary && primary && contrast(secondary, primary) >= 1.6 ? secondary : null;

  return (
    <>
      <section
        className="border-b-[6px]"
        style={{ background: band, color: ink, borderBottomColor: stripe ?? "transparent" }}
        aria-labelledby="team-h"
      >
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-8 px-4 pb-11 pt-10 sm:px-8">
          <div className="flex items-center gap-5 sm:gap-7">
            <TeamLogo team={team} size={120} className="max-sm:hidden" />
            <TeamLogo team={team} size={72} className="sm:hidden" />
            <div className="min-w-0">
              <span {...teamsAttr(team.id)} className="fav-plain block" style={{ "--fav": ink } as React.CSSProperties}>
                <FavBadge className="mb-2.5" />
              </span>
              <h1 id="team-h" className="display text-[36px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[72px]">{team.name}</h1>
              <p className="mt-3 text-[14px]" style={{ color: soft }}>
                <T k="team.seasonsInData" a={[[...seasonsOf].reverse().join(", ")]} />
                {formerNames.length > 0 && <T k="team.formerName" a={[formerNames[formerNames.length - 1][0], formerNames[0][1]]} />}
              </p>
              {team.logoPage && (
                <p className="mt-1 text-[12.5px]" style={{ color: soft }}>
                  <T k="team.logoLine" />{" "}
                  <a href={team.logoPage} className="underline underline-offset-4" style={{ color: ink }} rel="noopener">
                    <T k="team.logoOfficial" />
                  </a>
                </p>
              )}
            </div>
          </div>
          <dl className="flex gap-7 text-[13.5px]">
            {[...seasonsOf].reverse().map((s) => {
              const r = record(s);
              return (
                <div key={s}>
                  <dt className="num text-[12px]" style={{ color: soft }}><Titled k="team.recordRegular">{s}</Titled></dt>
                  <dd className="num display text-[24px] font-bold">{r ? `${r.wins}–${r.losses}${r.ties ? `–${r.ties}` : ""}` : "–"}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>
      <main className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-8">
        <SectionTabs
          accent={primary && !onLight ? primary : undefined}
          items={[
            { id: "lineup-h", label: <T k="team.tabs.lineup" /> },
            { id: "ta-h", label: <T k="team.tabs.overview" /> },
            { id: "kader-h", label: <T k="team.tabs.roster" /> },
            { id: "plan-h", label: <T k="team.tabs.results" /> },
          ]}
        />
        <div className="pt-10">
          {team.note && <p className="mb-6 max-w-[70ch] text-[13px] text-ink-3">{team.note}</p>}
          <SeasonNotice current={getMeta().currentSeason} latest={latest} subject="team" />
          <LineupSection team={team} season={latest} />
          <TeamView seasons={views} teams={teams} />
        </div>
      </main>
    </>
  );
}

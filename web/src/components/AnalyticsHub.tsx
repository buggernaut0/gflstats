"use client";

import Link from "next/link";
import LeaderCard from "./LeaderCard";
import TeamTag from "./TeamTag";
import type { LeaderCategory, LeaderRow, TeamLite } from "@/lib/dashboard";
import type { Breakout } from "@/lib/insights";
import { encodeConditions, type Condition } from "@/lib/query";
import { stat } from "@/lib/stats";
import { teamsAttr } from "@/lib/favorite";
import { useI18n } from "@/i18n/react";

function searchLink(path: string, conds: Condition[], extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ ...extra, c: encodeConditions(conds) });
  return `${path}?${q.toString()}`;
}

/** Beispielabfragen der drei Suchen (Texte in src/i18n analytics.searches). */
const SEARCHES = [
  {
    key: "players" as const,
    href: "/spieler/",
    examples: [
      searchLink("/spieler/", [{ stat: "receivingyards", op: "gte", a: 500 }, { stat: "touchdowncatch", op: "gte", a: 5 }], { rolle: "WR/TE" }),
      searchLink("/spieler/", [{ stat: "touchdownpass", op: "gte", a: 30 }], { rolle: "QB" }),
    ],
  },
  {
    key: "games" as const,
    href: "/analytics/spiele/",
    examples: [
      searchLink("/analytics/spiele/", [{ stat: "runyards", op: "gte", a: 150 }], { rolle: "RB" }),
      searchLink("/analytics/spiele/", [{ stat: "sacktotal", op: "gte", a: 2 }]),
    ],
  },
  {
    key: "teams" as const,
    href: "/analytics/teams/",
    examples: [
      searchLink("/analytics/teams/", [{ stat: "ppg", op: "gte", a: 40 }]),
      searchLink("/analytics/teams/", [{ stat: "papg", op: "lte", a: 15 }]),
    ],
  },
];

interface RecordTop { player: string; team: string; game: string; date: string; season: number; opponent: string; value: number }

/** Der Analytics-Hub: Vorschau auf Ranglisten, Rekorde, Breakouts, Suchen und Vergleiche. */
export default function AnalyticsHub({ season, firstSeason, leaders, records, breakouts, names, teams }: {
  season: number;
  firstSeason: number;
  leaders: { category: LeaderCategory; rows: LeaderRow[]; unavailable: boolean }[];
  records: { field: string; top: RecordTop }[];
  breakouts: Breakout[];
  names: Record<string, string>;
  teams: Record<string, TeamLite>;
}) {
  const f = useI18n();
  const a = f.m.analytics;
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink">{a.title}</h1>
      <p className="mt-3 max-w-[70ch] text-[14px] text-ink-2">{a.intro}</p>

      <section className="mt-12" aria-labelledby="h-rank">
        <HubHead id="h-rank" title={a.leadersTitle(season)} text={a.leadersText} href="/leaders/" cta={a.allLeaders} />
        <div className="grid gap-4 md:grid-cols-3">
          {leaders.map((l) => (
            <LeaderCard key={l.category.key} category={l.category} rows={l.rows} teams={teams} unavailable={l.unavailable} />
          ))}
        </div>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="h-rec">
          <HubHead id="h-rec" title={a.recordsTitle} text={a.recordsText(firstSeason)} href="/rekorde/" cta={a.allRecords} />
          <ul className="rounded-xl border border-line bg-surface py-1.5">
            {records.map(({ field, top }) => (
              <li key={field} {...teamsAttr(top.team)} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 px-4 py-2">
                <span className="min-w-0">
                  <span className="block text-[12.5px] text-ink-3">{a.inOneGame(f.statLabel(field))}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={`/spieler/${top.player}/`} className="truncate text-[14.5px] text-ink hover:underline hover:underline-offset-4">{names[top.player] ?? top.player}</Link>
                    <TeamTag team={teams[top.team]} />
                    <Link href={`/spiele/${top.game}/`} className="text-[12.5px] text-ink-3 hover:text-ink hover:underline">
                      {f.fmtShortDate(top.date)}{f.lang === "en" ? "/" : ""}{top.season} {a.against(teams[top.opponent]?.abbr ?? top.opponent)}
                    </Link>
                  </span>
                </span>
                <span className="num display text-[20px] font-semibold text-ink">{f.fmtStat(stat(field), top.value)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="h-bo">
          <HubHead id="h-bo" title={a.breakoutsTitle(season)} text={a.breakoutsText} href="/analytics/breakouts/" cta={a.allBreakouts} />
          {breakouts.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface px-4 py-5 text-[13.5px] text-ink-3">{a.noBreakouts(season)}</p>
          ) : (
            <ul className="rounded-xl border border-line bg-surface py-1.5">
              {breakouts.map((b) => (
                <li key={b.player} {...teamsAttr(b.teams)} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 px-4 py-2">
                  <span className="min-w-0">
                    <span className="block text-[12.5px] text-ink-3">
                      {b.role}, {f.statLabel(b.keyStat.key)} {f.fmtStat(stat(b.keyStat.key), b.keyStat.beforeValue)} → {f.fmtStat(stat(b.keyStat.key), b.keyStat.afterValue)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Link href={`/spieler/${b.player}/`} className="truncate text-[14.5px] text-ink hover:underline hover:underline-offset-4">{names[b.player] ?? b.player}</Link>
                      {b.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}
                    </span>
                  </span>
                  <span className="num text-[14px] text-ink-2">
                    {Math.round(b.before)} → <span className="display text-[20px] font-semibold text-ink">{Math.round(b.after)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-12" aria-labelledby="h-search">
        <HubHead id="h-search" title={a.queriesTitle} text={a.queriesText} />
        <div className="grid gap-4 md:grid-cols-3">
          {SEARCHES.map((s) => {
            const t = a.searches[s.key];
            return (
              <div key={s.href} className="flex flex-col rounded-xl border border-line bg-surface px-5 py-4">
                <Link href={s.href} className="display text-[20px] font-semibold text-ink hover:underline hover:underline-offset-4">{t.title}</Link>
                <p className="mt-1.5 text-[13.5px] text-ink-2">{t.text}</p>
                <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
                  {s.examples.map((href, i) => (
                    <li key={href}>
                      <Link href={href} className="text-[13.5px] text-accent-text underline-offset-4 hover:underline">{i === 0 ? t.ex1 : t.ex2}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="h-cmp">
        <HubHead id="h-cmp" title={a.compareTitle} text={a.compareText} />
        <div className="grid gap-4 md:grid-cols-2">
          <ToolCard href="/vergleich/" title={a.playerCompare} text={a.playerCompareText} />
          <ToolCard href="/analytics/teams/" title={a.teamCompare} text={a.teamCompareText} />
        </div>
        <p className="mt-6 text-[13.5px] text-ink-2">
          {a.methodLine}{" "}
          <Link href="/methodik/" className="text-accent-text underline-offset-4 hover:underline">{a.methodLink}</Link>.
        </p>
      </section>
    </main>
  );
}

function HubHead({ id, title, text, href, cta }: { id: string; title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-[70ch]">
        <h2 id={id} className="display text-[28px] font-bold leading-none tracking-tight text-ink">{title}</h2>
        <p className="mt-2 text-[13.5px] text-ink-2">{text}</p>
      </div>
      {href && cta && (
        <Link href={href} className="shrink-0 rounded-md border border-line px-3 py-1.5 text-[13.5px] font-medium text-ink-2 hover:border-line-strong hover:text-ink">
          {cta}
        </Link>
      )}
    </div>
  );
}

function ToolCard({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="flex h-full flex-col rounded-xl border border-line bg-surface px-5 py-4 hover:border-line-strong">
      <span className="display text-[20px] font-semibold text-ink">{title}</span>
      <span className="mt-1.5 text-[13.5px] text-ink-2">{text}</span>
    </Link>
  );
}

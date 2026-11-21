"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/react";
import type { TeamLite } from "@/lib/dashboard";
import { fmtDec } from "@/lib/format";
import type { Breakout, IndexRow } from "@/lib/insights";
import { BREAKOUT_RULES } from "@/lib/insights";
import { ROLE_MIN, stat } from "@/lib/stats";
import SourceTag from "./SourceTag";
import TeamTag from "./TeamTag";
import { teamsAttr } from "@/lib/favorite";

/** Rollen-Index je Rolle: die drei (oder n) Spieler mit dem hoechsten Index, mit Begruendung. */
export function RoleIndexSection({ rows, names, teams, season, perRole = 3, roles = ["QB", "RB", "WR/TE", "DEF"] }: { rows: IndexRow[]; names: Record<string, string>; teams: Record<string, TeamLite>; season: number; perRole?: number; roles?: string[] }) {
  const f = useI18n();
  const h = f.m.home;
  return (
    <section aria-labelledby={`ri-${season}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[78ch]">
          <h2 id={`ri-${season}`} className="display text-[34px] font-bold leading-none tracking-[-0.03em] text-ink">{h.roleIndexTitle}</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">
            {h.roleIndexNote(season)}{" "}
            <Link href="/methodik/#modelle" className="text-accent-text underline-offset-4 hover:underline">{h.howCalculated}</Link>
          </p>
        </div>
        <SourceTag kind="model" detail="home.roleIndexDetail" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {roles.map((role) => {
          const top = rows.filter((r) => r.role === role).slice(0, perRole);
          return (
            <div key={role} className="rounded-xl border border-line bg-surface">
              <h3 className="label-caps border-b-2 border-line-strong px-4 pb-2.5 pt-3.5 text-ink">{f.m.stats.roles[role] ?? role}</h3>
              <ol className="py-1">
                {top.map((r, i) => {
                  const best = [...r.axes].filter((a) => a.pct !== null).sort((a, b) => b.pct! - a.pct!).slice(0, 2);
                  return (
                    <li key={r.player} {...teamsAttr(r.teams)} className="px-4 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className={`num display text-[15px] font-semibold ${i === 0 ? "text-accent-text" : "text-ink-3"}`}>{i + 1}</span>
                          <Link href={`/spieler/${r.player}/`} className="truncate text-[14.5px] text-ink hover:underline hover:underline-offset-4">{names[r.player]}</Link>
                          {r.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}
                        </span>
                        <span className="num display text-[18px] font-semibold text-ink" title={h.roleIndexHint}>{Math.round(r.index)}</span>
                      </div>
                      <p className="mt-0.5 pl-6 text-[12.5px] text-ink-3">
                        {best.map((a) => `${f.statLabel(a.key)} ${f.fmtStat(stat(a.key), a.value)} (P${Math.round(a.pct!)})`).join(", ")}
                      </p>
                    </li>
                  );
                })}
                {top.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-3">{h.noPlayersWith(f.m.stats.qualifier(ROLE_MIN[role]))}</li>}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function BreakoutSection({ items, names, teams, season, limit = 6 }: { items: Breakout[]; names: Record<string, string>; teams: Record<string, TeamLite>; season: number; limit?: number }) {
  const f = useI18n();
  const h = f.m.home;
  return (
    <section aria-labelledby={`bo-${season}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[78ch]">
          <h2 id={`bo-${season}`} className="display text-[34px] font-bold leading-none tracking-[-0.03em] text-ink">{h.breakoutsTitle(season)}</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">
            {h.breakoutsNote(BREAKOUT_RULES.minDelta, season - 1, BREAKOUT_RULES.minIndex)}
          </p>
        </div>
        <SourceTag kind="model" />
      </div>
      {items.length === 0 ? (
        <p className="text-[14px] text-ink-3">{h.noBreakouts}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, limit).map((b) => (
            <div key={b.player} {...teamsAttr(b.teams)} className="rounded-xl border border-line bg-surface px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-baseline gap-2">
                  <Link href={`/spieler/${b.player}/`} className="truncate text-[15px] font-medium text-ink hover:underline hover:underline-offset-4">{names[b.player]}</Link>
                  {b.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}
                </span>
                <span className="text-[12.5px] text-ink-3">{b.role}</span>
              </div>
              <p className="num mt-1.5 text-[14px] text-ink-2">
                {h.roleIndex} <span className="text-ink-3">{Math.round(b.before)}</span> <span aria-hidden="true">→</span><span className="sr-only">{h.to}</span> <span className="font-semibold text-ink">{Math.round(b.after)}</span>
                <span className="ml-1.5 text-win">+{Math.round(b.after - b.before)}</span>
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">
                {f.statLabel(b.keyStat.key)}: {f.fmtStat(stat(b.keyStat.key), b.keyStat.beforeValue)} → {f.fmtStat(stat(b.keyStat.key), b.keyStat.afterValue)}. {h.breakoutGames(b.prevGames, b.games)}
                {b.prevTeams.join() !== b.teams.join() && h.teamChange}.
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export const fmtIndex = (x: number) => fmtDec(x, 0);

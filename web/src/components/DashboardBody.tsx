"use client";

import Link from "next/link";
import { useState } from "react";
import type { GamePerformance, LeaderCategory, LeaderRow, TeamLite, TeamRow } from "@/lib/dashboard";
import { useI18n } from "@/i18n/react";
import type { Scope } from "@/lib/types";
import LeaderCard from "./LeaderCard";
import ScopeToggle from "./ScopeToggle";
import SourceTag from "./SourceTag";
import TeamTable from "./TeamTable";
import TeamTag from "./TeamTag";
import { teamsAttr } from "@/lib/favorite";

export interface DashboardData {
  season: number;
  hasPlayoffs: boolean;
  categories: LeaderCategory[];
  unavailable: string[];
  leaders: Record<Scope, Record<string, LeaderRow[]>>;
  teamRows: Record<Scope, TeamRow[]>;
  performances: Record<Scope, GamePerformance[]>;
  teams: Record<string, TeamLite>;
}

export default function DashboardBody({ data }: { data: DashboardData }) {
  const [scope, setScope] = useState<Scope>("regular");
  const f = useI18n();
  const h = f.m.home;
  const scopeText = scope === "regular" ? f.m.common.regularSeason : scope === "playoff" ? f.m.common.playoffs : h.scopeBoth;

  return (
    <div className="flex flex-col gap-14">
      <div className="sticky top-[58px] z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur sm:top-[57px] sm:-mx-6 sm:px-6">
        <p className="text-[13.5px] text-ink-2">
          {h.allValues} <span className="text-ink">{scopeText} {data.season}</span>
        </p>
        <ScopeToggle value={scope} onChange={setScope} hasPlayoffs={data.hasPlayoffs} />
      </div>

      <section aria-labelledby="leaders-h">
        <SectionHead id="leaders-h" title={h.leadersTitle} note={h.leadersNote}>
          <SourceTag kind="original" />
          <SourceTag kind="rank" />
        </SectionHead>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {data.categories.map((c) => (
            <LeaderCard
              key={c.key}
              category={c}
              rows={data.leaders[scope][c.key] ?? []}
              teams={data.teams}
              unavailable={data.unavailable.includes(c.key)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="teams-h">
        <SectionHead
          id="teams-h"
          title={h.teamsTitle}
          note={h.teamsNote}
        >
          <SourceTag kind="original" detail="home.teamsOrig" />
          <SourceTag kind="derived" detail="home.teamsDerived" />
        </SectionHead>
        <TeamTable rows={data.teamRows[scope]} teams={data.teams} />
      </section>

      <section aria-labelledby="perf-h">
        <SectionHead id="perf-h" title={h.perfTitle} note={h.perfNote}>
          <SourceTag kind="original" />
        </SectionHead>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-[14px]">
            <caption className="sr-only">{h.perfCaption}</caption>
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-ink-3">
                <th scope="col" className="py-2.5 pl-4 font-medium">{h.colCategory}</th>
                <th scope="col" className="py-2.5 text-right font-medium">{f.m.common.value}</th>
                <th scope="col" className="py-2.5 pl-6 font-medium">{f.m.common.player}</th>
                <th scope="col" className="py-2.5 font-medium">{f.m.common.opponent}</th>
                <th scope="col" className="py-2.5 font-medium">{f.m.common.date}</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">{h.colExtra}</th>
              </tr>
            </thead>
            <tbody>
              {data.performances[scope].map((p) => (
                <tr key={p.field} {...teamsAttr(p.team)} className="border-b border-line last:border-0">
                  <td className="py-2.5 pl-4 text-ink-2">{h.categories[p.field] ?? p.title}</td>
                  <td className="num display py-2.5 text-right text-[18px] font-semibold text-ink">{f.fmt(p.value)}</td>
                  <td className="py-2.5 pl-6">
                    <span className="flex items-center gap-2">
                      <Link href={`/spieler/${p.player}/`} className="text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4">
                        {p.name}
                      </Link>
                      <TeamTag team={data.teams[p.team]} />
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="text-ink-3">{h.against}</span> <TeamTag team={data.teams[p.opponent]} />
                    </span>
                  </td>
                  <td className="num py-2.5 text-ink-2">{f.fmtShortDate(p.date)}</td>
                  <td className="py-2.5 pr-4 text-ink-3">{p.extra}</td>
                </tr>
              ))}
              {data.performances[scope].length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-ink-3">{f.m.games.none}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ id, title, note, children }: { id: string; title: string; note: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-[72ch]">
        <h2 id={id} className="display text-[28px] font-bold leading-none tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-2 text-[13.5px] text-ink-2">{note}</p>
      </div>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

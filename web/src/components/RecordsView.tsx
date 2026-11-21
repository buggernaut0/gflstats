"use client";

import Link from "next/link";
import { useState } from "react";
import type { TeamLite } from "@/lib/dashboard";
import { stat } from "@/lib/stats";
import { useI18n, type I18n } from "@/i18n/react";
import TeamTag from "./TeamTag";
import { teamsAttr } from "@/lib/favorite";

export interface RecordItem {
  player: string;
  name: string;
  teams: string[];
  value: number;
  /** Zusatz (Spiel, Saison, Karriere) – Text je Sprache in RecordsView */
  note: { kind: "game"; date: string; season: number; opp: string } | { kind: "season"; season: number; games: number } | { kind: "career"; seasons: number; games: number };
  href?: string;
}

const TABS = [
  { key: "game", label: "tabGame" },
  { key: "season", label: "tabSeason" },
  { key: "career", label: "tabCareer" },
] as const;

function noteText(n: RecordItem["note"], f: I18n): string {
  if (n.kind === "game") return `${f.fmtShortDate(n.date)}${f.lang === "en" ? "/" : ""}${n.season} ${f.m.analytics.against(n.opp)}`;
  if (n.kind === "season") return f.m.analytics.noteSeason(n.season, n.games);
  return f.m.analytics.noteCareer(n.seasons, n.games);
}

export default function RecordsView({ data, teams }: { data: Record<"game" | "season" | "career", Record<string, RecordItem[]>>; teams: Record<string, TeamLite> }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("game");
  const f = useI18n();
  return (
    <div>
      <div role="tablist" aria-label="Rekordart" className="mb-6 inline-flex rounded-lg border border-line bg-surface p-0.5">
        {TABS.map((t) => (
          <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`rounded-md px-3 py-1.5 text-[14px] font-medium ${tab === t.key ? "bg-surface-2 text-ink shadow-[inset_0_-2px_0_var(--accent)]" : "text-ink-2 hover:text-ink"}`}>
            {f.m.analytics[t.label]}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(data[tab]).map(([field, items]) => (
          <section key={field} className="rounded-xl border border-line bg-surface" aria-label={f.statLabel(field)}>
            <h2 className="label-caps border-b-2 border-line-strong px-4 pb-2.5 pt-3.5 text-ink">{f.statLabel(field)}</h2>
            <ol className="py-1.5">
              {items.map((r, i) => (
                <li key={`${r.player}-${r.note}`} {...teamsAttr(r.teams)} className="grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-x-2 px-4 py-1.5">
                  <span className={`num display text-[15px] font-semibold ${i === 0 ? "text-accent-text" : "text-ink-3"}`}>{i + 1}</span>
                  <span className="min-w-0">
                    <Link href={`/spieler/${r.player}/`} className="block truncate text-[14px] text-ink hover:underline hover:underline-offset-4">{r.name}</Link>
                    <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
                      {r.teams.slice(0, 3).map((t) => <TeamTag key={t} team={teams[t]} />)}
                      {r.href ? <Link href={r.href} className="hover:underline">{noteText(r.note, f)}</Link> : noteText(r.note, f)}
                    </span>
                  </span>
                  <span className="num display text-[17px] font-semibold text-ink">{f.fmtStat(stat(field), r.value)}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}


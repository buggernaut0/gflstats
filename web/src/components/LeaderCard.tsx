"use client";

import Link from "next/link";
import type { LeaderCategory, LeaderRow, TeamLite } from "@/lib/dashboard";
import TeamTag from "./TeamTag";
import PlayerPhoto from "./PlayerPhoto";
import { teamsAttr } from "@/lib/favorite";
import { useI18n } from "@/i18n/react";

export default function LeaderCard({
  category,
  rows,
  teams,
  unavailable,
}: {
  category: LeaderCategory;
  rows: LeaderRow[];
  teams: Record<string, TeamLite>;
  unavailable?: boolean;
}) {
  const max = rows[0]?.value ?? 0;
  const f = useI18n();
  const h = f.m.home;
  return (
    <section className="flex flex-col border border-line bg-bg" aria-labelledby={`lc-${category.key}`}>
      <header className="flex items-baseline justify-between gap-2 border-b-2 border-line-strong px-4 pb-2.5 pt-3.5">
        <h3 id={`lc-${category.key}`} className="label-caps text-ink">
          {h.categories[category.key] ?? category.title}
        </h3>
        <Link
          href={`/leaders/?kategorie=${category.key}`}
          className="shrink-0 text-[12.5px] text-ink-3 hover:text-accent-text"
          aria-label={h.fullRanking(h.categories[category.key] ?? category.title)}
        >
          {h.all}
        </Link>
      </header>
      {unavailable || rows.length === 0 ? (
        <p className="px-4 py-5 text-[13.5px] text-ink-3">{unavailable ? h.notRecordedSeason : h.noValues}</p>
      ) : (
        <ol className="flex flex-col py-1.5">
          {rows.map((r, i) => (
            <li key={r.player} {...teamsAttr(r.teams)} className="grid grid-cols-[1.25rem_auto_1fr_auto] items-center gap-x-2 px-4 py-[6px]">
              <span className={`num display row-span-2 text-[15px] font-semibold ${i === 0 ? "text-accent-text" : "text-ink-3"}`}>
                {r.tied ? `${r.rank}=` : r.rank}
              </span>
              <PlayerPhoto photo={r.photo} name={r.name} width={32} className="row-span-2" />
              {/* Name über die volle Breite, Wert unter dem Namen neben Team und Balken – so bleibt der Name lesbar */}
              <Link
                href={`/spieler/${r.player}/`}
                title={r.name}
                className="col-span-2 truncate text-[14.5px] text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4"
              >
                <span className="xl:hidden">{r.name}</span>
                <span className="hidden xl:inline">{shortName(r.name)}</span>
              </Link>
              <span className="mt-0.5 flex min-w-0 items-center gap-2">
                {r.teams.map((t) => (
                  <TeamTag key={t} team={teams[t]} />
                ))}
                <span className="block h-[4px] flex-1 overflow-hidden bg-[var(--bar-track)]" aria-hidden="true">
                  <span className="block h-full" style={{ width: `${max ? (r.value / max) * 100 : 0}%`, background: i === 0 ? "var(--accent)" : "var(--ink-3)" }} />
                </span>
              </span>
              <span className="num display mt-0.5 text-right text-[17px] font-bold leading-none text-ink">{f.fmt(r.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** "Broghean McGovern" -> "B. McGovern" fuer schmale Karten; der volle Name steht im Tooltip. */
export function shortName(name: string): string {
  const parts = name.split(" ");
  if (parts.length < 2 || name.includes(" / ")) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

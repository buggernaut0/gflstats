"use client";

import Link from "next/link";
import { useState } from "react";
import type { TeamLite } from "@/lib/dashboard";
import { fmtShortDate } from "@/lib/format";

export interface ListGame {
  id: string;
  season: number;
  date: string;
  playoff: boolean;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

/** Spielplan je Saison mit Ergebnissen; Klick fuehrt zum Box Score. */
export default function GameList({ games, seasons, teams }: { games: ListGame[]; seasons: number[]; teams: Record<string, TeamLite> }) {
  const [season, setSeason] = useState(seasons[seasons.length - 1]);
  const [team, setTeam] = useState("");
  const shown = games.filter((g) => g.season === season && (!team || g.home === team || g.away === team)).sort((a, b) => a.date.localeCompare(b.date));
  const teamIds = [...new Set(games.filter((g) => g.season === season).flatMap((g) => [g.home, g.away]))].sort((a, b) => (teams[a]?.name ?? a).localeCompare(teams[b]?.name ?? b, "de"));
  const byDate = new Map<string, ListGame[]>();
  for (const g of shown) byDate.set(g.date, [...(byDate.get(g.date) ?? []), g]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Saison" className="flex gap-1">
          {[...seasons].reverse().map((s) => (
            <button key={s} role="tab" type="button" aria-selected={s === season} onClick={() => setSeason(s)} className={`num rounded-md px-2.5 py-1 text-[14px] font-medium ${s === season ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team filtern" className="h-9 rounded-md border border-line bg-surface px-2 text-[14px] text-ink">
          <option value="">Alle Teams</option>
          {teamIds.map((t) => (
            <option key={t} value={t}>
              {teams[t]?.name ?? t}
            </option>
          ))}
        </select>
        <span className="text-[13px] text-ink-3">{shown.length} Spiele</span>
      </div>
      <div className="flex flex-col gap-5">
        {[...byDate.entries()].map(([date, list]) => (
          <section key={date}>
            <h2 className="num mb-1.5 text-[13px] font-medium text-ink-3">
              {fmtShortDate(date)}{date.slice(0, 4)}
              {list.some((g) => g.playoff) && <span className="ml-2 rounded border border-line px-1 text-[10.5px]">Playoffs</span>}
            </h2>
            <ul className="overflow-hidden rounded-xl border border-line bg-surface">
              {list.map((g) => {
                const homeWon = g.homeScore > g.awayScore;
                return (
                  <li key={g.id} className="border-b border-line last:border-0">
                    <Link href={`/spiele/${g.id}/`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-2.5 hover:bg-surface-2/60">
                      <span className={`truncate text-right text-[14.5px] ${!homeWon ? "text-ink" : "text-ink-2"}`}>{teams[g.away]?.name ?? g.away}</span>
                      <span className="num display text-[19px] font-semibold text-ink">
                        <span className={homeWon ? "text-ink-3" : ""}>{g.awayScore}</span>
                        <span className="mx-1.5 text-ink-3">@</span>
                        <span className={!homeWon ? "text-ink-3" : ""}>{g.homeScore}</span>
                      </span>
                      <span className={`truncate text-[14.5px] ${homeWon ? "text-ink" : "text-ink-2"}`}>{teams[g.home]?.name ?? g.home}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

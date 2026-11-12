"use client";

import Link from "next/link";
import { useState } from "react";
import type { TeamLite } from "@/lib/dashboard";
import { fmtShortDate } from "@/lib/format";
import { formatStat, stat } from "@/lib/stats";
import type { Stats } from "@/lib/types";
import TeamTag from "./TeamTag";
import { teamsAttr } from "@/lib/favorite";

export interface LogRow {
  game: string;
  season: number;
  date: string;
  playoff: boolean;
  team: string;
  opponent: string;
  home: boolean;
  teamScore: number;
  oppScore: number;
  stats: Stats;
}

/** Spielprotokoll: jede Partie eines Spielers mit Ergebnis und den wichtigsten Werten seiner Rolle. */
export default function GameLog({ rows, cols, teams, availability }: { rows: LogRow[]; cols: string[]; teams: Record<string, TeamLite>; availability: Record<string, number[]> }) {
  const seasons = [...new Set(rows.map((r) => r.season))].sort((a, b) => b - a);
  const [season, setSeason] = useState<number>(seasons[0]);
  const shown = rows.filter((r) => r.season === season).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div>
      <div role="tablist" aria-label="Saison" className="mb-3 flex flex-wrap gap-1">
        {seasons.map((s) => (
          <button
            key={s}
            role="tab"
            type="button"
            aria-selected={s === season}
            onClick={() => setSeason(s)}
            className={`num rounded-md px-2.5 py-1 text-[13.5px] font-medium ${s === season ? "bg-surface-2 text-ink shadow-[inset_0_-2px_0_var(--accent)]" : "text-ink-2 hover:text-ink"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[12px] text-ink-3">
              <th scope="col" className="py-2 pl-4 text-left font-medium">Datum</th>
              <th scope="col" className="py-2 text-left font-medium">Gegner</th>
              <th scope="col" className="py-2 text-left font-medium">Ergebnis</th>
              {cols.map((c) => (
                <th key={c} scope="col" title={stat(c).label} className="px-2 py-2 text-right font-medium last:pr-4">
                  {stat(c).abbr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const won = r.teamScore > r.oppScore;
              const tie = r.teamScore === r.oppScore;
              return (
                <tr key={r.game} {...teamsAttr(r.team)} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                  <td className="num py-2 pl-4 text-ink-2">
                    {fmtShortDate(r.date)}
                    {r.playoff && <span className="ml-1.5 rounded border border-line px-1 text-[10.5px] text-ink-3">PO</span>}
                  </td>
                  <td className="py-2">
                    <span className="flex items-center gap-1.5 text-ink-3">
                      {r.home ? "vs" : "@"} <TeamTag team={teams[r.opponent]} />
                    </span>
                  </td>
                  <td className="num py-2">
                    <Link href={`/spiele/${r.game}/`} className="hover:underline hover:underline-offset-4">
                      <span className={`mr-1.5 font-semibold ${won ? "text-win" : tie ? "text-ink-2" : "text-loss"}`}>{won ? "S" : tie ? "U" : "N"}</span>
                      <span className="text-ink-2">
                        {r.teamScore}:{r.oppScore}
                      </span>
                    </Link>
                  </td>
                  {cols.map((c) => {
                    const avail = stat(c).needs.every((f) => availability[f]?.includes(r.season));
                    return (
                      <td key={c} className="num px-2 py-2 text-right text-ink last:pr-4">
                        {avail ? formatStat(stat(c), r.stats[c] ?? 0) : <span className="text-[12px] text-ink-3">n. e.</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12.5px] text-ink-3">S = Sieg, N = Niederlage, PO = Playoff-Spiel. „vs“ Heimspiel, „@“ Auswärtsspiel.</p>
    </div>
  );
}

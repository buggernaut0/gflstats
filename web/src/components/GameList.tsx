"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readQuery, writeQuery } from "@/lib/clientData";
import type { TeamLite } from "@/lib/dashboard";
import { fmtShortDate } from "@/lib/format";
import { teamsAttr } from "@/lib/favorite";
import TeamLogo from "./TeamLogo";
import { VideoMark } from "./VideoPlayer";

export interface ListGame {
  id: string;
  season: number;
  date: string;
  playoff: boolean;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  /** Teamnamen der jeweiligen Saison */
  homeName: string;
  awayName: string;
  /** Runde bei Playoff-Spielen, falls die Quelle sie nennt */
  round?: string;
  video: boolean;
}

/** Spielplan je Saison mit Ergebnissen; Klick fuehrt zum Box Score. */
export default function GameList({ games, seasons, teams }: { games: ListGame[]; seasons: number[]; teams: Record<string, TeamLite> }) {
  const [season, setSeason] = useState(seasons[seasons.length - 1]);
  const [team, setTeam] = useState("");
  const [onlyVideo, setOnlyVideo] = useState(false);
  const [ready, setReady] = useState(false);

  // Filter stehen in der Adresse (teilbar), wie bei den Suchen
  useEffect(() => {
    const q = readQuery();
    const s = Number(q.get("saison"));
    if (seasons.includes(s)) setSeason(s);
    if (q.get("team")) setTeam(q.get("team")!);
    if (q.get("highlights") === "1") setOnlyVideo(true);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (ready) writeQuery({ saison: season === seasons[seasons.length - 1] ? undefined : String(season), team: team || undefined, highlights: onlyVideo ? "1" : undefined });
  }, [ready, season, team, onlyVideo, seasons]);

  const inSeason = games.filter((g) => g.season === season);
  const shown = inSeason.filter((g) => (!team || g.home === team || g.away === team) && (!onlyVideo || g.video)).sort((a, b) => a.date.localeCompare(b.date));
  const videoCount = inSeason.filter((g) => g.video).length;
  const teamIds = [...new Set(inSeason.flatMap((g) => [g.home, g.away]))].sort((a, b) => (teams[a]?.name ?? a).localeCompare(teams[b]?.name ?? b, "de"));
  const byDate = new Map<string, ListGame[]>();
  for (const g of shown) byDate.set(g.date, [...(byDate.get(g.date) ?? []), g]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Saison" className="flex gap-1">
          {[...seasons].reverse().map((s) => (
            <button key={s} role="tab" type="button" aria-selected={s === season} onClick={() => { setSeason(s); setTeam(""); }} className={`num rounded-md px-2.5 py-1 text-[14px] font-medium ${s === season ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}>
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
        {videoCount > 0 && (
          <label className="flex items-center gap-2 text-[13.5px] text-ink-2">
            <input type="checkbox" checked={onlyVideo} onChange={(e) => setOnlyVideo(e.target.checked)} className="accent-[var(--accent)]" /> nur mit Highlights ({videoCount})
          </label>
        )}
        <span className="text-[13px] text-ink-3">{shown.length} Spiele</span>
      </div>
      {shown.length === 0 && <p className="text-[14px] text-ink-3">Keine Spiele in dieser Auswahl.</p>}
      <div className="flex flex-col gap-5">
        {[...byDate.entries()].map(([date, list]) => (
          <section key={date}>
            <h2 className="num mb-1.5 text-[13px] font-medium text-ink-3">
              {fmtShortDate(date)}{date.slice(0, 4)}
              {list.some((g) => g.playoff) && <span className="ml-2 rounded border border-line px-1 text-[10.5px]">{list.find((g) => g.round)?.round ?? "Playoffs"}</span>}
            </h2>
            <ul className="overflow-hidden rounded-xl border border-line bg-surface">
              {list.map((g) => {
                const homeWon = g.homeScore > g.awayScore;
                const awayWon = g.awayScore > g.homeScore;
                return (
                  <li key={g.id} {...teamsAttr([g.away, g.home])} className="border-b border-line last:border-0">
                    <Link href={`/spiele/${g.id}/`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 hover:bg-surface-2/60 sm:gap-x-4">
                      <span className={`flex min-w-0 items-center justify-end gap-2.5 text-[14.5px] ${awayWon ? "font-medium text-ink" : "text-ink-2"}`}>
                        <span className="truncate sm:hidden">{teams[g.away]?.short ?? g.awayName}</span>
                        <span className="hidden truncate sm:inline">{g.awayName}</span>
                        <TeamLogo team={teams[g.away]} size={24} />
                      </span>
                      <span className="num display text-[19px] font-semibold text-ink">
                        <span className={awayWon ? "" : "text-ink-3"}>{g.awayScore}</span>
                        <span className="mx-1.5 text-ink-3">@</span>
                        <span className={homeWon ? "" : "text-ink-3"}>{g.homeScore}</span>
                      </span>
                      <span className={`flex min-w-0 items-center gap-2.5 text-[14.5px] ${homeWon ? "font-medium text-ink" : "text-ink-2"}`}>
                        <TeamLogo team={teams[g.home]} size={24} />
                        <span className="truncate sm:hidden">{teams[g.home]?.short ?? g.homeName}</span>
                        <span className="hidden truncate sm:inline">{g.homeName}</span>
                        {g.video && <span className="ml-auto shrink-0 pl-1"><VideoMark label="" /><span className="sr-only">Highlights vorhanden</span></span>}
                      </span>
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

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TeamLite } from "@/lib/dashboard";
import { stat } from "@/lib/stats";
import { useI18n } from "@/i18n/react";
import { TEAM_METRICS, fmtMetric } from "@/lib/team";
import type { Scope, Stats } from "@/lib/types";
import ScopeToggle from "./ScopeToggle";
import SourceTag from "./SourceTag";
import TeamTag from "./TeamTag";
import { VideoMark } from "./VideoPlayer";

export interface RosterRow {
  /** null = steht im offiziellen Kader, aber in keinem Statistikbogen (kein Profil) */
  player: string | null;
  name: string;
  role: string | null;
  /** Rückennummer und Positionsgruppe laut offiziellem Kader (null = kein Kader-Eintrag) */
  number: number | null;
  position: string | null;
  games: number;
  stats: Stats;
}

export interface TeamSeasonView {
  season: number;
  hasPlayoffs: boolean;
  metrics: Record<Scope, { games: number; wins: number; losses: number; ties: number; values: Record<string, number | null>; ranks: Record<string, { rank: number; of: number } | null> } | null>;
  roster: RosterRow[];
  /** offizieller Kader dieser Saison (Quelle der Nummern/Positionen), null = keiner hinterlegt */
  rosterSource: { url: string; retrieved: string | null } | null;
  schedule: { id: string; date: string; playoff: boolean; home: boolean; opponent: string; teamScore: number; oppScore: number; name: string; video?: boolean }[];
}

const ROSTER_COLS = ["passingyards", "touchdownpass", "runyards", "touchdownrun", "catched", "receivingyards", "touchdowncatch", "tackletotal", "sacktotal", "intercepted"];
const ROLES = ["QB", "RB", "WR/TE", "DEF", "K", "P"];
const POSITIONS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];

export default function TeamView({ seasons, teams }: { seasons: TeamSeasonView[]; teams: Record<string, TeamLite> }) {
  const [season, setSeason] = useState(seasons[0].season);
  const [scope, setScope] = useState<Scope>("regular");
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: "games", desc: true });
  const data = seasons.find((s) => s.season === season)!;
  const hasRoster = !!data.rosterSource;
  const positions = POSITIONS.filter((p) => data.roster.some((r) => r.position === p));
  const m = data.metrics[scope] ?? data.metrics.all;
  const f = useI18n();
  const tx = f.m;

  const roster = useMemo(() => {
    const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const fits = (r: RosterRow) =>
      !role || (role.startsWith("pos:") ? r.position === role.slice(4) : r.role === role || (role === "none" && !r.role));
    const rows = data.roster.filter((r) => fits(r) && (!q || norm(r.name).includes(norm(q))));
    const val = (r: RosterRow) => (sort.key === "games" ? r.games : sort.key === "name" ? 0 : r.stats[sort.key] ?? 0);
    if (sort.key === "number") {
      // ohne Nummer immer ans Ende, gleiche Nummer nach Name
      const dir = sort.desc ? -1 : 1;
      return rows.sort((a, b) =>
        a.number === null || b.number === null
          ? (a.number === null ? 1 : 0) - (b.number === null ? 1 : 0) || a.name.localeCompare(b.name, f.locale)
          : (a.number - b.number) * dir || a.name.localeCompare(b.name, f.locale));
    }
    return rows.sort((a, b) => (sort.key === "name" ? a.name.localeCompare(b.name, f.locale) * (sort.desc ? -1 : 1) : (val(b) - val(a)) * (sort.desc ? 1 : -1)));
  }, [data, role, q, sort, f.locale]);

  const th = (key: string, label: string, title?: string) => (
    <th key={key} scope="col" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"} className={`px-2 py-2 text-right font-medium ${sort.key === key ? "bg-accent-soft text-ink" : ""}`}>
      <button type="button" title={title} onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))} className="hover:text-ink">
        {label}
      </button>
    </th>
  );

  return (
    <div>
      <div className="sticky top-[58px] z-30 -mx-4 mb-8 flex flex-wrap items-center gap-3 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur sm:top-[57px] sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label={tx.common.season} className="flex gap-1">
          {seasons.map((s) => (
            <button key={s.season} role="tab" type="button" aria-selected={s.season === season} onClick={() => setSeason(s.season)} className={`num rounded-md px-2.5 py-1 text-[14px] font-medium ${s.season === season ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}>
              {s.season}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <ScopeToggle value={scope} onChange={setScope} hasPlayoffs={data.hasPlayoffs} />
        </div>
      </div>

      {m && (
        <section aria-labelledby="ta-h">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="ta-h" className="display text-[28px] font-bold leading-none tracking-tight text-ink">
                {tx.team.analyticsTitle(season)}
              </h2>
              <p className="mt-2 text-[13.5px] text-ink-2">
                {tx.team.analyticsNote(`${m.wins}–${m.losses}${m.ties ? `–${m.ties}` : ""}`, m.games)}
              </p>
            </div>
            <div className="flex gap-1.5">
              <SourceTag kind="derived" />
              <SourceTag kind="rank" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM_METRICS.map((d) => {
              const x = m.values[d.key];
              const rk = m.ranks[d.key];
              const top = rk && rk.rank <= 3;
              return (
                <div key={d.key} className="rounded-xl border border-line bg-surface px-4 py-3" title={tx.team.metric.formula(d)}>
                  <p className="text-[12.5px] text-ink-3">{tx.team.metric.label(d)}</p>
                  <p className="num display text-[26px] font-semibold leading-tight text-ink">{d.since && season < d.since ? tx.common.notRecorded : fmtMetric(d, x, f.lang)}</p>
                  <p className={`text-[12px] ${top ? "text-accent-text" : "text-ink-3"}`}>{rk ? tx.common.rankOf(rk.rank, rk.of) : " "}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="kader-h" className="mt-14">
        <div className="mb-4">
          <h2 id="kader-h" className="display text-[28px] font-bold leading-none tracking-tight text-ink">
            {tx.team.rosterTitle(season)}
          </h2>
          <p className="mt-2 text-[13.5px] text-ink-2">{tx.team.rosterNote}</p>
          {data.rosterSource && (
            <p className="mt-1 text-[13px] text-ink-3">
              {tx.team.rosterOfficialA}
              <a href={data.rosterSource.url} className="text-accent-text underline-offset-4 hover:underline" rel="noopener">{tx.team.rosterOfficialLink}</a>
              {tx.team.rosterOfficialB(data.rosterSource.retrieved ? f.fmtShortDate(data.rosterSource.retrieved) : null)}
            </p>
          )}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx.team.nameFilter} aria-label={tx.team.nameFilterLabel} className="h-9 w-56 rounded-md border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3" />
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label={tx.team.roleFilterLabel} className="h-9 rounded-md border border-line bg-surface px-2 text-[14px] text-ink">
            <option value="">{tx.team.allRoles}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tx.stats.roles[r] ?? r}
              </option>
            ))}
            <option value="none">{tx.team.noRole}</option>
            {positions.length > 0 && (
              <optgroup label={tx.team.positionGroup}>
                {positions.map((p) => (
                  <option key={p} value={`pos:${p}`}>
                    {tx.stats.positions[p] ?? p}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <span className="text-[13px] text-ink-3">{tx.common.playersN(roster.length)}</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-ink-3">
                {hasRoster && (
                  <th scope="col" aria-sort={sort.key === "number" ? (sort.desc ? "descending" : "ascending") : "none"} className={`w-12 py-2 pl-4 text-right font-medium ${sort.key === "number" ? "bg-accent-soft text-ink" : ""}`}>
                    <button type="button" title={tx.team.numberTitle} onClick={() => setSort((s) => ({ key: "number", desc: s.key === "number" ? !s.desc : false }))} className="hover:text-ink">
                      #
                    </button>
                  </th>
                )}
                <th scope="col" className="py-2 pl-4 text-left font-medium">
                  <button type="button" onClick={() => setSort((s) => ({ key: "name", desc: s.key === "name" ? !s.desc : false }))} className="hover:text-ink">
                    {tx.common.player}
                  </button>
                </th>
                {hasRoster && <th scope="col" className="py-2 pr-2 text-left font-medium" title={tx.team.positionTitle}>{tx.team.positionCol}</th>}
                <th scope="col" className="py-2 text-left font-medium">{tx.common.role}</th>
                {th("games", tx.player.gamesCol, tx.common.games)}
                {ROSTER_COLS.map((c) => th(c, f.statAbbr(c), f.statLabel(c)))}
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.player ?? `kader:${r.number}:${r.name}`} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                  {hasRoster && <td className="num py-1.5 pl-4 text-right font-semibold text-ink">{r.number ?? <span className="font-normal text-ink-3">–</span>}</td>}
                  <td className="py-1.5 pl-4">
                    {r.player ? (
                      <Link href={`/spieler/${r.player}/`} className="text-ink hover:underline hover:underline-offset-4">
                        {r.name}
                      </Link>
                    ) : (
                      <span className="text-ink-2" title={tx.team.rosterOnly}>{r.name}</span>
                    )}
                  </td>
                  {hasRoster && <td className="py-1.5 pr-2 text-ink-2" title={r.position ? tx.stats.positions[r.position] : undefined}>{r.position ?? "–"}</td>}
                  <td className="py-1.5 text-ink-3">{r.role ?? "–"}</td>
                  <td className="num px-2 py-1.5 text-right text-ink-2">{r.player ? r.games : <span className="text-ink-3" title={tx.team.rosterOnly}>–</span>}</td>
                  {ROSTER_COLS.map((c) => (
                    <td key={c} className={`num px-2 py-1.5 text-right ${r.stats[c] ? "text-ink" : "text-ink-3"}`}>
                      {r.stats[c] ? f.fmtStat(stat(c), r.stats[c]) : "·"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="plan-h" className="mt-14">
        <h2 id="plan-h" className="display mb-4 text-[28px] font-bold leading-none tracking-tight text-ink">
          {tx.team.scheduleTitle(season)}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[560px] border-collapse text-[14px]">
            <tbody>
              {data.schedule.map((g) => {
                const won = g.teamScore > g.oppScore;
                return (
                  <tr key={g.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                    <td className="num py-2 pl-4 text-ink-2">
                      {f.fmtShortDate(g.date)}
                      {g.playoff && <span className="ml-1.5 rounded border border-line px-1 text-[10.5px] text-ink-3">{tx.player.playoffShort}</span>}
                    </td>
                    <td className="py-2 text-ink-3">{g.home ? tx.common.vs : tx.common.at}</td>
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <TeamTag team={teams[g.opponent]} />
                        <span className="text-ink">{teams[g.opponent]?.name}</span>
                      </span>
                    </td>
                    <td className="num py-2 pr-4 text-right">
                      <Link href={`/spiele/${g.id}/`} className="hover:underline hover:underline-offset-4">
                        {g.video && <span className="mr-3 align-middle"><VideoMark label="" /></span>}
                        <span className={`mr-2 font-semibold ${won ? "text-win" : g.teamScore === g.oppScore ? "text-ink-2" : "text-loss"}`}>{won ? tx.common.win : g.teamScore === g.oppScore ? tx.common.tie : tx.common.loss}</span>
                        <span className="text-ink">
                          {g.teamScore}:{g.oppScore}
                        </span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

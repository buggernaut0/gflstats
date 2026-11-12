"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TeamLite } from "@/lib/dashboard";
import { fmtShortDate } from "@/lib/format";
import { ROLE_LABELS, formatStat, stat } from "@/lib/stats";
import { TEAM_METRICS, fmtMetric } from "@/lib/team";
import type { Scope, Stats } from "@/lib/types";
import ScopeToggle from "./ScopeToggle";
import SourceTag from "./SourceTag";
import TeamTag from "./TeamTag";

export interface RosterRow {
  player: string;
  name: string;
  role: string | null;
  games: number;
  stats: Stats;
}

export interface TeamSeasonView {
  season: number;
  hasPlayoffs: boolean;
  metrics: Record<Scope, { games: number; wins: number; losses: number; ties: number; values: Record<string, number | null>; ranks: Record<string, { rank: number; of: number } | null> } | null>;
  roster: RosterRow[];
  schedule: { id: string; date: string; playoff: boolean; home: boolean; opponent: string; teamScore: number; oppScore: number; name: string }[];
}

const ROSTER_COLS = ["passingyards", "touchdownpass", "runyards", "touchdownrun", "catched", "receivingyards", "touchdowncatch", "tackletotal", "sacktotal", "intercepted"];
const ROLES = ["QB", "RB", "WR/TE", "DEF", "K", "P"];

export default function TeamView({ seasons, teams }: { seasons: TeamSeasonView[]; teams: Record<string, TeamLite> }) {
  const [season, setSeason] = useState(seasons[0].season);
  const [scope, setScope] = useState<Scope>("regular");
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: "games", desc: true });
  const data = seasons.find((s) => s.season === season)!;
  const m = data.metrics[scope] ?? data.metrics.all;

  const roster = useMemo(() => {
    const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const rows = data.roster.filter((r) => (!role || r.role === role || (role === "none" && !r.role)) && (!q || norm(r.name).includes(norm(q))));
    const val = (r: RosterRow) => (sort.key === "games" ? r.games : sort.key === "name" ? 0 : r.stats[sort.key] ?? 0);
    return rows.sort((a, b) => (sort.key === "name" ? a.name.localeCompare(b.name, "de") * (sort.desc ? -1 : 1) : (val(b) - val(a)) * (sort.desc ? 1 : -1)));
  }, [data, role, q, sort]);

  const th = (key: string, label: string, title?: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"} className={`px-2 py-2 text-right font-medium ${sort.key === key ? "bg-accent-soft text-ink" : ""}`}>
      <button type="button" title={title} onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))} className="hover:text-ink">
        {label}
      </button>
    </th>
  );

  return (
    <div>
      <div className="sticky top-[58px] z-30 -mx-4 mb-8 flex flex-wrap items-center gap-3 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur sm:top-[57px] sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label="Saison" className="flex gap-1">
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
                Team Analytics {season}
              </h2>
              <p className="mt-2 text-[13.5px] text-ink-2">
                Bilanz <span className="num text-ink">{m.wins}–{m.losses}{m.ties ? `–${m.ties}` : ""}</span> in {m.games} Spielen. Rang = Platz unter allen Teams dieser Saison.
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
                <div key={d.key} className="rounded-xl border border-line bg-surface px-4 py-3" title={d.formula}>
                  <p className="text-[12.5px] text-ink-3">{d.label}</p>
                  <p className="num display text-[26px] font-semibold leading-tight text-ink">{d.since && season < d.since ? "n. e." : fmtMetric(d, x)}</p>
                  <p className={`text-[12px] ${top ? "text-accent-text" : "text-ink-3"}`}>{rk ? `Rang ${rk.rank} von ${rk.of}` : " "}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="kader-h" className="mt-14">
        <div className="mb-4">
          <h2 id="kader-h" className="display text-[28px] font-bold leading-none tracking-tight text-ink">
            Kader {season}
          </h2>
          <p className="mt-2 text-[13.5px] text-ink-2">Alle Spieler mit Eintrag im Statistikbogen, Werte der ganzen Saison. Rollen sind aus den Statistiken abgeleitet. Spalten anklicken zum Sortieren.</p>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Spielername" aria-label="Spielername filtern" className="h-9 w-56 rounded-md border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3" />
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Rolle filtern" className="h-9 rounded-md border border-line bg-surface px-2 text-[14px] text-ink">
            <option value="">Alle Rollen</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
            <option value="none">Ohne eindeutige Rolle</option>
          </select>
          <span className="text-[13px] text-ink-3">{roster.length} Spieler</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-ink-3">
                <th scope="col" className="py-2 pl-4 text-left font-medium">
                  <button type="button" onClick={() => setSort((s) => ({ key: "name", desc: s.key === "name" ? !s.desc : false }))} className="hover:text-ink">
                    Spieler
                  </button>
                </th>
                <th scope="col" className="py-2 text-left font-medium">Rolle</th>
                {th("games", "Sp", "Spiele")}
                {ROSTER_COLS.map((c) => th(c, stat(c).abbr, stat(c).label))}
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.player} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                  <td className="py-1.5 pl-4">
                    <Link href={`/spieler/${r.player}/`} className="text-ink hover:underline hover:underline-offset-4">
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-1.5 text-ink-3">{r.role ?? "–"}</td>
                  <td className="num px-2 py-1.5 text-right text-ink-2">{r.games}</td>
                  {ROSTER_COLS.map((c) => (
                    <td key={c} className={`num px-2 py-1.5 text-right ${r.stats[c] ? "text-ink" : "text-ink-3"}`}>
                      {r.stats[c] ? formatStat(stat(c), r.stats[c]) : "·"}
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
          Spielplan {season}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[560px] border-collapse text-[14px]">
            <tbody>
              {data.schedule.map((g) => {
                const won = g.teamScore > g.oppScore;
                return (
                  <tr key={g.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                    <td className="num py-2 pl-4 text-ink-2">
                      {fmtShortDate(g.date)}
                      {g.playoff && <span className="ml-1.5 rounded border border-line px-1 text-[10.5px] text-ink-3">PO</span>}
                    </td>
                    <td className="py-2 text-ink-3">{g.home ? "vs" : "@"}</td>
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <TeamTag team={teams[g.opponent]} />
                        <span className="text-ink">{teams[g.opponent]?.name}</span>
                      </span>
                    </td>
                    <td className="num py-2 pr-4 text-right">
                      <Link href={`/spiele/${g.id}/`} className="hover:underline hover:underline-offset-4">
                        <span className={`mr-2 font-semibold ${won ? "text-win" : g.teamScore === g.oppScore ? "text-ink-2" : "text-loss"}`}>{won ? "S" : g.teamScore === g.oppScore ? "U" : "N"}</span>
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

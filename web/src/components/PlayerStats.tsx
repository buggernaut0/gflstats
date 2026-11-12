"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TeamLite } from "@/lib/dashboard";
import { FIELD_DEFS, formatStat, stat, value } from "@/lib/stats";
import { SEASON_TABLES } from "@/lib/tables";
import type { Scope, Stats } from "@/lib/types";
import ScopeToggle from "./ScopeToggle";
import TeamTag from "./TeamTag";

export interface SplitRow {
  season: number;
  team: string;
  scope: Scope;
  games: number;
  stats: Stats;
}

const MAX_FIELDS = new Set(FIELD_DEFS.filter((f) => f.agg === "max").map((f) => f.key));

function sum(rows: SplitRow[]): { games: number; stats: Stats } {
  const stats: Stats = {};
  let games = 0;
  for (const r of rows) {
    games += r.games;
    for (const [k, v] of Object.entries(r.stats)) stats[k] = MAX_FIELDS.has(k) ? Math.max(stats[k] ?? 0, v) : Math.round(((stats[k] ?? 0) + v) * 100) / 100;
  }
  return { games, stats };
}

/** Saisontabellen je Bereich mit Filter nach Spielphase und Team; Karrierezeile = Summe der gezeigten Zeilen. */
export default function PlayerStats({
  rows,
  teams,
  availability,
  hasPlayoffs,
}: {
  rows: SplitRow[];
  teams: Record<string, TeamLite>;
  availability: Record<string, number[]>;
  hasPlayoffs: boolean;
}) {
  const [scope, setScope] = useState<Scope>("all");
  const [team, setTeam] = useState<string>("");
  const teamIds = [...new Set(rows.map((r) => r.team))];

  const shown = useMemo(
    () => rows.filter((r) => r.scope === scope && (!team || r.team === team)).sort((a, b) => b.season - a.season || a.team.localeCompare(b.team)),
    [rows, scope, team],
  );
  const career = sum(shown);
  const groups = SEASON_TABLES.filter((g) => shown.some((r) => g.activity.some((f) => (r.stats[f] ?? 0) > 0)));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <ScopeToggle value={scope} onChange={setScope} hasPlayoffs={hasPlayoffs} />
        {teamIds.length > 1 && (
          <label className="flex items-center gap-2 text-[13.5px] text-ink-2">
            Team
            <select value={team} onChange={(e) => setTeam(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2 text-ink">
              <option value="">Alle Teams</option>
              {teamIds.map((t) => (
                <option key={t} value={t}>
                  {teams[t]?.name ?? t}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {shown.length === 0 && <p className="text-[14px] text-ink-3">Keine Spiele in dieser Auswahl.</p>}
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`st-${g.key}`}>
            <h3 id={`st-${g.key}`} className="display mb-2 text-[20px] font-semibold text-ink">
              {g.title}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-line text-[12px] text-ink-3">
                    <th scope="col" className="py-2 pl-4 text-left font-medium">Saison</th>
                    <th scope="col" className="py-2 text-left font-medium">Team</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium" title="Spiele mit Eintrag im Statistikbogen">Sp</th>
                    {g.cols.map((c) => {
                      const d = stat(c);
                      return (
                        <th key={c} scope="col" title={d.formula ? `${d.label}: ${d.formula}` : d.label} className="px-2 py-2 text-right font-medium last:pr-4">
                          {d.abbr}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={`${r.season}-${r.team}`} className="border-b border-line">
                      <td className="num py-2 pl-4">
                        <Link href={`/saison/${r.season}/`} className="text-ink hover:underline hover:underline-offset-4">
                          {r.season}
                        </Link>
                      </td>
                      <td className="py-2">
                        <TeamTag team={teams[r.team]} />
                      </td>
                      <td className="num px-2 py-2 text-right text-ink-2">{r.games}</td>
                      {g.cols.map((c) => (
                        <Cell key={c} k={c} stats={r.stats} games={r.games} available={stat(c).needs.every((f) => availability[f]?.includes(r.season))} />
                      ))}
                    </tr>
                  ))}
                  {shown.length > 1 && (
                    <tr className="bg-surface-2/70 font-semibold">
                      <td className="py-2 pl-4 text-ink" colSpan={2}>
                        Gesamt
                      </td>
                      <td className="num px-2 py-2 text-right text-ink">{career.games}</td>
                      {g.cols.map((c) => {
                        const avail = shown.some((r) => stat(c).needs.every((f) => availability[f]?.includes(r.season)));
                        return <Cell key={c} k={c} stats={career.stats} games={career.games} available={avail} strong />;
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-3">
        „n. e.“ = in dieser Saison nicht erfasst. Spalten mit Formel: Maus über die Überschrift. Die Gesamtzeile summiert die gezeigten Zeilen; Quoten werden aus den Summen neu berechnet.
      </p>
    </div>
  );
}

function Cell({ k, stats, games, available, strong }: { k: string; stats: Stats; games: number; available: boolean; strong?: boolean }) {
  const d = stat(k);
  if (!available) {
    return (
      <td className="px-2 py-2 text-right text-[12px] text-ink-3 last:pr-4" title="In dieser Saison nicht erfasst">
        n. e.
      </td>
    );
  }
  const x = value(d, stats, games);
  return <td className={`num px-2 py-2 text-right last:pr-4 ${strong ? "text-ink" : d.kind === "derived" ? "text-ink-2" : "text-ink"}`}>{formatStat(d, x)}</td>;
}

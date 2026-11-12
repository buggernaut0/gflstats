"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TeamLite, TeamRow } from "@/lib/dashboard";
import { fmt, fmtDec, fmtSigned } from "@/lib/format";
import { teamsAttr } from "@/lib/favorite";

type Col = {
  key: keyof TeamRow;
  label: string;
  title: string;
  fmt: (r: TeamRow) => string;
  lowerIsBetter?: boolean;
  derived?: boolean;
};

const COLS: Col[] = [
  { key: "games", label: "Sp", title: "Spiele", fmt: (r) => fmt(r.games) },
  { key: "wins", label: "S", title: "Siege", fmt: (r) => fmt(r.wins) },
  { key: "losses", label: "N", title: "Niederlagen", fmt: (r) => fmt(r.losses), lowerIsBetter: true },
  { key: "winPct", label: "Quote", title: "Siegquote = (Siege + ½ Unentschieden) / Spiele", fmt: (r) => fmtDec(r.winPct, 3).replace(/^0/, ""), derived: true },
  { key: "pointsFor", label: "Pkt", title: "Erzielte Punkte (aus den Endständen)", fmt: (r) => fmt(r.pointsFor) },
  { key: "pointsAgainst", label: "Geg", title: "Zugelassene Punkte (aus den Endständen)", fmt: (r) => fmt(r.pointsAgainst), lowerIsBetter: true },
  { key: "diff", label: "Diff", title: "Punktdifferenz", fmt: (r) => fmtSigned(r.diff), derived: true },
  { key: "ppg", label: "Pkt/Sp", title: "Erzielte Punkte pro Spiel", fmt: (r) => fmtDec(r.ppg), derived: true },
  { key: "papg", label: "Geg/Sp", title: "Zugelassene Punkte pro Spiel", fmt: (r) => fmtDec(r.papg), lowerIsBetter: true, derived: true },
  { key: "yardsPg", label: "Yds/Sp", title: "Passing + Rushing Yards pro Spiel (Summe der Spielerwerte)", fmt: (r) => fmtDec(r.yardsPg), derived: true },
  { key: "yardsAllowedPg", label: "Geg Yds/Sp", title: "Zugelassene Passing + Rushing Yards pro Spiel", fmt: (r) => fmtDec(r.yardsAllowedPg), lowerIsBetter: true, derived: true },
];

/** Sortierbare Teamtabelle. Klick auf eine Spalte sortiert; zweiter Klick dreht die Richtung. */
export default function TeamTable({ rows, teams }: { rows: TeamRow[]; teams: Record<string, TeamLite> }) {
  const [sort, setSort] = useState<{ key: keyof TeamRow | null; desc: boolean }>({ key: null, desc: true });

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const k = sort.key;
    return [...rows].sort((a, b) => ((a[k] as number) - (b[k] as number)) * (sort.desc ? -1 : 1));
  }, [rows, sort]);

  function click(c: Col) {
    setSort((s) => (s.key === c.key ? { key: c.key, desc: !s.desc } : { key: c.key, desc: !c.lowerIsBetter }));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[820px] border-collapse text-[14px]">
        <caption className="sr-only">Teamtabelle, sortierbar</caption>
        <thead>
          <tr className="border-b border-line text-ink-3">
            <th scope="col" className="w-10 py-2.5 pl-4 text-left text-[12px] font-medium">#</th>
            <th scope="col" className="py-2.5 pr-3 text-left text-[12px] font-medium">Team</th>
            {COLS.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"}
                  className={`px-2 py-1.5 text-right text-[12px] font-medium ${active ? "bg-accent-soft text-ink" : ""}`}
                >
                  <button type="button" onClick={() => click(c)} title={c.title} className="inline-flex items-center gap-1 rounded px-1 py-1 hover:text-ink">
                    {c.label}
                    <span aria-hidden="true" className={active ? "text-accent-text" : "opacity-0"}>
                      {sort.desc ? "▼" : "▲"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const t = teams[r.team];
            return (
              <tr key={r.team} {...teamsAttr(r.team)} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                <td className="num py-2 pl-4 text-ink-3">{i + 1}</td>
                <td className="py-2 pr-3">
                  <Link href={`/teams/${r.team}/`} className="font-medium text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4">
                    {t?.name ?? r.team}
                  </Link>
                </td>
                {COLS.map((c) => (
                  <td
                    key={c.key}
                    className={`num px-3 py-2 text-right ${sort.key === c.key ? "bg-accent-soft font-semibold text-ink" : "text-ink-2"} ${
                      c.key === "diff" ? (r.diff > 0 ? "!text-win" : r.diff < 0 ? "!text-loss" : "") : ""
                    }`}
                  >
                    {c.fmt(r)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

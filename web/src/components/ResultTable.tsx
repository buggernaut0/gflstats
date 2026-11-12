"use client";

import { useMemo, useState } from "react";
import { teamsAttr } from "@/lib/favorite";

export interface Column<T> {
  key: string;
  label: string;
  title?: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  sort?: (row: T) => number | string | null;
  /** Sortierrichtung beim ersten Klick: true = groesster Wert zuerst */
  descFirst?: boolean;
}

/** Sortierbare Ergebnistabelle mit Rang-Spalte und schrittweisem Nachladen. */
export default function ResultTable<T>({
  rows,
  columns,
  initialSort,
  rowKey,
  caption,
  pageSize = 100,
  rank = true,
  rowTeams,
}: {
  rows: T[];
  columns: Column<T>[];
  initialSort?: { key: string; desc: boolean };
  rowKey: (row: T) => string;
  caption: string;
  pageSize?: number;
  rank?: boolean;
  /** Team(s) des Datensatzes, fuer die Lieblingsteam-Markierung */
  rowTeams?: (row: T) => string | string[] | undefined;
}) {
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, desc: true });
  const [limit, setLimit] = useState(pageSize);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const get = col.sort;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const d = typeof x === "string" ? x.localeCompare(String(y), "de") : x - (y as number);
      return sort.desc ? -d : d;
    });
  }, [rows, columns, sort]);

  // Geteilte Raenge bei gleichem Wert der Sortierspalte
  const sortCol = columns.find((c) => c.key === sort.key);
  const ranks: number[] = [];
  sorted.forEach((r, i) => {
    const same = i > 0 && sortCol?.sort && sortCol.sort(r) === sortCol.sort(sorted[i - 1]);
    ranks.push(same ? ranks[i - 1] : i + 1);
  });

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[760px] border-collapse text-[13.5px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line text-[12px] text-ink-3">
              {rank && <th scope="col" className="w-12 py-2 pl-4 text-left font-medium">#</th>}
              {columns.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"}
                    className={`px-2 py-2 font-medium first:pl-4 last:pr-4 ${c.align === "left" ? "text-left" : "text-right"} ${active ? "bg-accent-soft text-ink" : ""}`}
                  >
                    {c.sort ? (
                      <button type="button" title={c.title} onClick={() => setSort((s) => (s.key === c.key ? { key: c.key, desc: !s.desc } : { key: c.key, desc: c.descFirst ?? true }))} className="inline-flex items-center gap-1 hover:text-ink">
                        {c.label}
                        <span aria-hidden="true" className={active ? "text-accent-text" : "opacity-0"}>
                          {sort.desc ? "▼" : "▲"}
                        </span>
                      </button>
                    ) : (
                      <span title={c.title}>{c.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, limit).map((r, i) => (
              <tr key={rowKey(r)} {...teamsAttr(rowTeams?.(r))} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                {rank && (
                  <td className="num py-1.5 pl-4 text-ink-3">
                    {ranks[i]}
                    {(ranks[i + 1] === ranks[i] || ranks[i - 1] === ranks[i]) && "="}
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={`px-2 py-1.5 first:pl-4 last:pr-4 ${c.align === "left" ? "text-left" : "num text-right"} ${sort.key === c.key ? "bg-accent-soft font-semibold text-ink" : "text-ink"}`}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-[14px] text-ink-3">
                  Keine Treffer. Bedingungen lockern oder Filter zurücksetzen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + pageSize)} className="mt-3 rounded-md border border-line px-3 py-1.5 text-[13.5px] text-ink-2 hover:text-ink">
          Weitere {Math.min(pageSize, sorted.length - limit)} von {sorted.length - limit} anzeigen
        </button>
      )}
    </div>
  );
}

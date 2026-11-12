import Link from "next/link";
import type { LeaderCategory, LeaderRow, TeamLite } from "@/lib/dashboard";
import { fmt } from "@/lib/format";
import TeamTag from "./TeamTag";

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
  return (
    <section className="flex flex-col rounded-xl border border-line bg-surface" aria-labelledby={`lc-${category.key}`}>
      <header className="flex items-baseline justify-between gap-2 border-b border-line px-4 pb-2.5 pt-3">
        <h3 id={`lc-${category.key}`} className="display text-[18px] font-semibold leading-tight text-ink">
          {category.title}
        </h3>
        <Link
          href={`/leaders/?kategorie=${category.key}`}
          className="shrink-0 text-[12.5px] text-ink-3 hover:text-accent-text"
          aria-label={`Komplette Rangliste ${category.title}`}
        >
          Alle
        </Link>
      </header>
      {unavailable || rows.length === 0 ? (
        <p className="px-4 py-5 text-[13.5px] text-ink-3">{unavailable ? "In dieser Saison nicht erfasst." : "Keine Werte in dieser Auswahl."}</p>
      ) : (
        <ol className="flex flex-col py-1.5">
          {rows.map((r, i) => (
            <li key={r.player} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-2 px-4 py-[6px]">
              <span className={`num display text-[15px] font-semibold ${i === 0 ? "text-accent-text" : "text-ink-3"}`}>
                {r.tied ? `${r.rank}=` : r.rank}
              </span>
              <Link
                href={`/spieler/${r.player}/`}
                title={r.name}
                className="truncate text-[14.5px] text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4"
              >
                <span className="xl:hidden">{r.name}</span>
                <span className="hidden xl:inline">{shortName(r.name)}</span>
              </Link>
              <span className="num display text-right text-[17px] font-semibold text-ink">{fmt(r.value)}</span>
              <span className="col-start-2 col-end-4 mt-1 flex items-center gap-2">
                {r.teams.map((t) => (
                  <TeamTag key={t} team={teams[t]} />
                ))}
                <span className="block h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--bar-track)]" aria-hidden="true">
                  <span className="block h-full rounded-full" style={{ width: `${max ? (r.value / max) * 100 : 0}%`, background: i === 0 ? "var(--accent)" : "var(--bar)" }} />
                </span>
              </span>
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

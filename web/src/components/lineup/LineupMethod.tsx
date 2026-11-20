"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/react";
import type { Lineup } from "@/lib/lineup";

/** Gruppen, die sich den elften Offense-Platz teilen */
const FLEX_COUNT: Record<string, string> = { RB: "1–2", WR: "2–3", REC: "3–4" };

/** „So wird die Aufstellung ermittelt“ – Regeln der Starting Lineup in der gewählten Sprache. */
export default function LineupMethod({ provisional, slots, minShare, regularShare, teamGames, minGames, flex, hasColors, rosterNote }: {
  provisional: boolean;
  slots: { position: string; count: number }[];
  minShare: number;
  regularShare: number;
  teamGames: number;
  minGames: number;
  flex: Lineup["flex"];
  hasColors: boolean;
  rosterNote?: string | null;
}) {
  const { m } = useI18n();
  const t = m.team;
  const slotKey = (pos: string) => (provisional && pos === "OL" ? "OL_provisional" : pos);
  const reason = flex.code
    ? flex.code === "scrimmage"
      ? t.flex.scrimmage(flex.rb ?? 0, flex.rbSlot ?? "", flex.rec ?? 0, flex.recSlot ?? "")
      : t.flex[flex.code]
    : flex.reason;
  return (
    <details className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-2">
      <summary className="cursor-pointer text-ink">{t.methodSummary}</summary>
      <div className="mt-3 flex max-w-[86ch] flex-col gap-2">
        <p>{t.methodIntro(Math.round(minShare * 100), teamGames, minGames, Math.round(regularShare * 100))}</p>
        <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {slots.map((s) => (
            <li key={s.position}>
              <span className="font-medium text-ink">
                {FLEX_COUNT[s.position] ?? s.count} × {m.stats.positions[s.position] ?? s.position}:
              </span>{" "}
              {t.slotBasis[slotKey(s.position)]}; {t.slotMin[slotKey(s.position)]}
            </li>
          ))}
        </ul>
        <p>
          <span className="font-medium text-ink">{t.elevenTitle}</span>
          {t.eleven(provisional)}
          {flex.winner && t.here(flex.winner, reason)}
        </p>
        {provisional && <p>{t.provisionalNote}</p>}
        <p>
          {t.schematic} {hasColors ? t.colorsKnown : t.colorsNeutral}{" "}
          <Link href="/methodik/" className="text-accent-text underline-offset-4 hover:underline">{t.methodLink}</Link>
        </p>
        {rosterNote && <p className="text-ink-3">{t.rosterHint(rosterNote)}</p>}
      </div>
    </details>
  );
}

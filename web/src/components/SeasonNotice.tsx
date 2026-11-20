"use client";

import { useI18n } from "@/i18n/react";

/**
 * Hinweis, wenn für die aktuelle Saison keine Daten vorliegen: Die Seite zeigt dann die jüngste vorhandene
 * Saison – ausdrücklich gekennzeichnet, nie als Werte der aktuellen Saison ausgegeben.
 */
export default function SeasonNotice({ current, latest, subject }: { current: number; latest: number; subject: "player" | "team" }) {
  const { m } = useI18n();
  if (latest >= current) return null;
  return (
    <p role="note" className="mb-6 flex flex-wrap items-baseline gap-x-2 rounded-lg border border-line bg-surface px-4 py-3 text-[13.5px] text-ink-2">
      <b className="font-semibold text-ink">{m.seasonNotice.title(current)}</b>
      <span>{subject === "player" ? m.seasonNotice.player(current, latest) : m.seasonNotice.team(current, latest)}</span>
    </p>
  );
}

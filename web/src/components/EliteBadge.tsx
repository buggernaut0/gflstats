"use client";

/**
 * Elite-Abzeichen: kennzeichnet die besten zehn Spieler einer Positionsgruppe (trapview/spotlight/elite.ts).
 * Wird nur gezeigt, wenn ein Elite-Eintrag vorliegt – die Komponente vergibt selbst nichts.
 *
 *   lg – Broadcast-Plakette (Trap View, Spielerkarte): ELITE + „#3 · Top 10 Quarterbacks“
 *   md – Profilkopf und Duell-Ansicht: ELITE + „#3 QB“
 *   sm – Tabellen und Listen: nur Wappen + ELITE, Details im Tooltip
 * Gestaltung in globals.css (.elite-badge), damit Website und Trap View dasselbe Abzeichen zeigen.
 * Gruppennamen in der gewählten Sprache (src/i18n, elite.groups – über die Profil-ID, nicht den gespeicherten Text).
 */
import type { EliteEntry } from "@/trapview/spotlight/elite";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/react";

/** Gruppe, Titel und Kurzform eines Elite-Eintrags in der gewählten Sprache. */
export function eliteText(e: EliteEntry, m: Messages) {
  return m.elite.groups[e.profile] ?? { group: e.group, title: e.title, short: e.short };
}

export function eliteTitle(e: EliteEntry, m: Messages, season?: number): string {
  return m.elite.tooltip(season, e.rank, eliteText(e, m).group, e.of, Math.round(e.score));
}

export function EliteCrest({ className = "" }: { className?: string }) {
  return (
    <svg className={`elite-badge__crest ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.6 20.4 4.7v6.4c0 5.3-3.6 9.5-8.4 11.3-4.8-1.8-8.4-6-8.4-11.3V4.7z" fill="#2b1c05" />
      <path d="M12 2.9 19.2 5.6v5.5c0 4.6-3.1 8.3-7.2 9.9-4.1-1.6-7.2-5.3-7.2-9.9V5.6z" fill="none" stroke="#f3d27a" strokeWidth="0.9" opacity="0.85" />
      <path d="m12 6.6 1.65 3.35 3.7.54-2.68 2.6.63 3.68L12 15.03l-3.3 1.74.63-3.68-2.68-2.6 3.7-.54z" fill="#f6d983" />
    </svg>
  );
}

export default function EliteBadge({
  entry,
  size = "md",
  season,
  className = "",
}: {
  entry: EliteEntry;
  size?: "sm" | "md" | "lg";
  season?: number;
  className?: string;
}) {
  const { m } = useI18n();
  const g = eliteText(entry, m);
  return (
    <span className={`elite-badge elite-badge--${size} ${className}`} title={eliteTitle(entry, m, season)}>
      <EliteCrest />
      <span className="elite-badge__word">{m.elite.word}</span>
      {size === "md" && <span className="elite-badge__meta">#{entry.rank} {g.short}</span>}
      {size === "lg" && (
        <span className="elite-badge__meta">
          <b>#{entry.rank}</b> {m.elite.top10(g.title)}
        </span>
      )}
      <span className="sr-only">{m.elite.srRank(entry.rank, g.group)}</span>
    </span>
  );
}

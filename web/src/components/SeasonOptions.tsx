"use client";

import { ALL_SEASONS } from "@/lib/seasonFilter";
import { useI18n } from "@/i18n/react";

/** Optionen des Saisonfilters: aktuelle Saison zuerst (Standard), dann ältere absteigend, zuletzt alle Saisons. */
export default function SeasonOptions({ seasons, current }: { seasons: number[]; current: number }) {
  const { m } = useI18n();
  return (
    <>
      <option value="">{m.common.currentSeasonOpt(current)}</option>
      {[...seasons].sort((a, b) => b - a).filter((s) => s !== current).map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
      <option value={ALL_SEASONS}>{m.common.allSeasons}</option>
    </>
  );
}

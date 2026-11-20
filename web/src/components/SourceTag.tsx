"use client";

import { useI18n } from "@/i18n/react";
import type { MessagePath } from "@/i18n/messages";

type Kind = "original" | "derived" | "rank" | "model";

/** Kennzeichnet, woher eine Zahl stammt (Original, Berechnet, Ranking, Modell). detail = Text-Pfad in src/i18n (noch nicht übersetzte Stellen: Text, wird unverändert gezeigt). */
export default function SourceTag({ kind, detail }: { kind: Kind; detail?: MessagePath | (string & {}) }) {
  const { m, t } = useI18n();
  const label = m.source[kind];
  const hint = m.source[`${kind}Hint`];
  return (
    <span
      title={detail ? `${hint}. ${t(detail as MessagePath)}` : hint}
      className="inline-flex cursor-help items-center rounded-full border border-line px-2 py-[1px] text-[11px] font-medium text-ink-3"
    >
      {label}
    </span>
  );
}

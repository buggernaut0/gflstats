"use client";

import type { Loaded } from "@/lib/clientData";
import { useI18n } from "@/i18n/react";

/** Lade- und Fehlerzustand fuer Seiten, die Daten im Browser laden. */
export function Loading({ state }: { state: Loaded<unknown> }) {
  const { m } = useI18n();
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink">
        {m.common.loadError(String(state.error))}
      </p>
    );
  }
  return (
    <p className="py-10 text-[14px] text-ink-3" aria-live="polite">
      {m.common.loading}
    </p>
  );
}

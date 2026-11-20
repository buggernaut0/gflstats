"use client";

import type { Scope } from "@/lib/types";
import { useI18n } from "@/i18n/react";

const OPTIONS: Scope[] = ["regular", "playoff", "all"];

export default function ScopeToggle({ value, onChange, hasPlayoffs = true }: { value: Scope; onChange: (s: Scope) => void; hasPlayoffs?: boolean }) {
  const { m } = useI18n();
  const label: Record<Scope, string> = { regular: m.common.regularSeason, playoff: m.common.playoffs, all: m.common.total };
  return (
    <div role="radiogroup" aria-label={m.playerSearch.scope} className="inline-flex rounded-lg border border-line bg-surface p-0.5">
      {OPTIONS.filter((o) => hasPlayoffs || o !== "playoff").map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={`rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
            value === o ? "bg-surface-2 text-ink shadow-[inset_0_-2px_0_var(--accent)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {label[o]}
        </button>
      ))}
    </div>
  );
}

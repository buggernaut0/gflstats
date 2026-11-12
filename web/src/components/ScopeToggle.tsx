"use client";

import type { Scope } from "@/lib/types";

const OPTIONS: { value: Scope; label: string }[] = [
  { value: "regular", label: "Regular Season" },
  { value: "playoff", label: "Playoffs" },
  { value: "all", label: "Gesamt" },
];

export default function ScopeToggle({ value, onChange, hasPlayoffs = true }: { value: Scope; onChange: (s: Scope) => void; hasPlayoffs?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Spielphase" className="inline-flex rounded-lg border border-line bg-surface p-0.5">
      {OPTIONS.filter((o) => hasPlayoffs || o.value !== "playoff").map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
            value === o.value ? "bg-surface-2 text-ink shadow-[inset_0_-2px_0_var(--accent)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

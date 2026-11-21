"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/react";

/**
 * Leiste mit Sprungmarken zu den Abschnitten einer langen Seite. Klebt ab Tablet-Breite unter der
 * Kopfzeile; der Abschnitt im Blick wird unterstrichen (Farbe: --tab-accent, sonst Blau).
 */
export default function SectionTabs({ items, accent }: { items: { id: string; label: ReactNode }[]; accent?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  // Abschnitte, die es auf der Seite gar nicht gibt (z. B. keine Starting Lineup), bekommen keinen Reiter
  const [present, setPresent] = useState<Set<string> | null>(null);
  const label = useI18n().m.shell.onThisPage;

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    setPresent(new Set(els.map((e) => e.id)));
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-130px 0px -60% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Abschnitte stehen nach dem ersten Zeichnen fest
  }, []);

  return (
    <nav
      aria-label={label}
      className="z-30 -mx-4 border-b border-line bg-bg/95 px-4 sm:sticky sm:top-[72px] sm:-mx-8 sm:px-8"
      style={accent ? ({ "--tab-accent": accent } as React.CSSProperties) : undefined}
    >
      <div className="flex gap-1 overflow-x-auto">
        {items.filter((i) => !present || present.has(i.id)).map((i) => (
          <a
            key={i.id}
            href={`#${i.id}`}
            aria-current={active === i.id ? "location" : undefined}
            className={`shrink-0 whitespace-nowrap px-3.5 pb-3 pt-3.5 text-[14px] ${
              active === i.id ? "font-semibold text-ink shadow-[inset_0_-3px_0_var(--tab-accent,var(--accent))]" : "font-medium text-ink-2 hover:text-ink"
            }`}
          >
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

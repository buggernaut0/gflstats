"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "@/lib/nav";
import { useI18n } from "@/i18n/react";

export default function NavLinks() {
  const path = usePathname() || "/";
  const { m } = useI18n();
  return (
    <nav aria-label={m.nav.main} className="no-scrollbar -mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto sm:overflow-visible">
      {NAV.map((item) => {
        const active = isActive(path, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative shrink-0 px-3 py-2.5 text-[15px] font-medium transition-colors ${
              active ? "text-ink" : "text-ink-2 hover:bg-surface hover:text-ink"
            }`}
          >
            {m.nav[item.key]}
            {active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-accent" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

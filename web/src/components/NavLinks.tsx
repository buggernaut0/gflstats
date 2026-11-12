"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/leaders/", label: "Leaders" },
  { href: "/spieler/", label: "Spieler" },
  { href: "/teams/", label: "Teams" },
  { href: "/spiele/", label: "Spiele" },
  { href: "/analytics/", label: "Analytics" },
  { href: "/rekorde/", label: "Rekorde" },
];

export default function NavLinks() {
  const path = usePathname() || "/";
  return (
    <nav aria-label="Hauptnavigation" className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto">
      {NAV.map((item) => {
        const base = item.href.replace(/\/$/, "");
        const active = path === base || path.startsWith(`${base}/`) || (item.href === "/analytics/" && path.startsWith("/vergleich"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative shrink-0 rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
              active ? "text-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            {item.label}
            {active && <span className="absolute inset-x-3 -bottom-[13px] h-[3px] rounded-full bg-accent" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

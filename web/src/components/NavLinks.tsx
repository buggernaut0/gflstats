"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "@/lib/nav";

export default function NavLinks() {
  const path = usePathname() || "/";
  return (
    <nav aria-label="Hauptnavigation" className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto sm:overflow-visible">
      {NAV.map((item) => {
        const active = isActive(path, item);
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
            {active && <span className="absolute inset-x-3 bottom-0 h-[3px] sm:-bottom-[13px] rounded-full bg-accent" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/react";

/** Logo-Link zur Startseite (Beschriftung für Screenreader in der gewählten Sprache). */
export default function HomeLink({ children }: { children: ReactNode }) {
  const { m } = useI18n();
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={m.shell.home}>
      {children}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/react";
import type { MessagePath } from "@/i18n/messages";

/** Rueckweg zum Analytics-Hub fuer alle Werkzeugseiten (Leaders, Rekorde, Suchen, Vergleich, Breakouts). current = Text-Pfad in src/i18n. */
export default function AnalyticsCrumb({ current }: { current: MessagePath }) {
  const { m, t } = useI18n();
  return (
    <nav aria-label={m.analytics.crumb} className="mb-4 text-[13px] text-ink-3">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/analytics/" className="hover:text-ink hover:underline hover:underline-offset-4">
            {m.analytics.title}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-ink-2">
          {t(current)}
        </li>
      </ol>
    </nav>
  );
}

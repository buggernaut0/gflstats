import Link from "next/link";

/** Rueckweg zum Analytics-Hub fuer alle Werkzeugseiten (Leaders, Rekorde, Suchen, Vergleich, Breakouts). */
export default function AnalyticsCrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Brotkrümelnavigation" className="mb-4 text-[13px] text-ink-3">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/analytics/" className="hover:text-ink hover:underline hover:underline-offset-4">
            Analytics
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-ink-2">
          {current}
        </li>
      </ol>
    </nav>
  );
}

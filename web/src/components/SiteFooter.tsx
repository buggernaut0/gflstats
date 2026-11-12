import Link from "next/link";
import { getMeta } from "@/lib/data";
import { fmtStamp } from "@/lib/format";

export default function SiteFooter() {
  const meta = getMeta();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4 px-4 py-6 text-[13px] text-ink-3 sm:px-6">
        <p>
          Daten: statsnscore.online, Saisons {meta.seasons[0]}–{meta.seasons[meta.seasons.length - 1]}, Stand {fmtStamp(meta.builtAt)}.
        </p>
        <nav aria-label="Fußzeile" className="flex gap-4">
          <Link href="/methodik/" className="hover:text-ink">Methodik und Korrekturen</Link>
        </nav>
      </div>
    </footer>
  );
}

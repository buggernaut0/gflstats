import Link from "next/link";
import { getMeta } from "@/lib/data";
import { T } from "@/i18n/react";
import FooterData from "./FooterData";

export default function SiteFooter() {
  const meta = getMeta();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4 px-4 py-6 text-[13px] text-ink-3 sm:px-6">
        <FooterData from={meta.seasons[0]} to={meta.seasons[meta.seasons.length - 1]} builtAt={meta.builtAt} />
        <nav className="flex gap-4">
          <Link href="/methodik/" className="hover:text-ink"><T k="shell.methodLink" /></Link>
        </nav>
      </div>
    </footer>
  );
}

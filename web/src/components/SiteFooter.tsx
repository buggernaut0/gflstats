import Link from "next/link";
import { getMeta } from "@/lib/data";
import { NAV } from "@/lib/nav";
import { T } from "@/i18n/react";
import FooterData from "./FooterData";

export default function SiteFooter() {
  const meta = getMeta();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-x-8 gap-y-4 px-4 pb-9 pt-7 text-[13.5px] leading-relaxed text-ink-2 sm:px-8">
        <div className="max-w-[640px]">
          <FooterData from={meta.seasons[0]} to={meta.seasons[meta.seasons.length - 1]} builtAt={meta.builtAt} />
          <Link href="/methodik/" className="text-accent-text hover:underline hover:underline-offset-4">
            <T k="shell.methodLink" />
          </Link>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1">
          {NAV.slice(0, 4).map((item) => (
            <Link key={item.href} href={item.href} className="text-ink-2 hover:text-ink">
              <T k={`nav.${item.key}`} />
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

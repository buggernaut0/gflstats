import Link from "next/link";
import NavLinks from "./NavLinks";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="GFL Analytics, Startseite">
          <Mark />
          <span className="display text-[21px] font-bold leading-none tracking-tight text-ink">
            GFL<span className="ml-1 font-semibold text-ink-2">Analytics</span>
          </span>
        </Link>
        <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <NavLinks />
        </div>
        <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
          <div className="hidden md:block">
            <SearchBox />
          </div>
          <ThemeToggle />
        </div>
        <div className="order-4 w-full md:hidden">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}

/** Bildmarke: Yard-Linien mit gelber First-Down-Linie. */
function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect x="0.5" y="0.5" width="25" height="25" rx="6" fill="var(--surface-2)" stroke="var(--line-strong)" />
      <path d="M7 5v16M12 5v16M19 5v16" stroke="var(--ink-3)" strokeWidth="1.4" />
      <path d="M15.5 4v18" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

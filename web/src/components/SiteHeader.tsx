import { getTeamSeasons, getTeams, teamNameIn } from "@/lib/data";
import FavoriteTeamPicker, { FavoriteWelcome, type PickerTeam } from "./FavoriteTeam";
import NavLinks from "./NavLinks";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";
import HomeLink from "./HomeLink";
import { LanguageSwitcher } from "@/i18n/react";

/** Teams fuer die Lieblingsteam-Auswahl: offizieller Name der letzten eigenen Saison, aktuelle Saison zuerst. */
function pickerTeams(): PickerTeam[] {
  const seasons = getTeamSeasons();
  const latest = Math.max(...seasons.map((s) => s.season));
  const lastOf = new Map<string, number>();
  for (const s of seasons) lastOf.set(s.team, Math.max(lastOf.get(s.team) ?? 0, s.season));
  return getTeams()
    .map((t) => {
      const last = lastOf.get(t.id) ?? latest;
      return { id: t.id, name: teamNameIn(t, last), short: t.short, abbr: t.abbr, logo: t.logo ?? null, colors: t.colors, current: last === latest };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Kopfzeile: blaue Oberkante, Wortmarke "GFL" im blauen Quadrat + "Analytics", Navigation mit Unterstrich. */
export default function SiteHeader() {
  const teams = pickerTeams();
  return (
    <>
    <header className="sticky top-0 z-40 border-t-[5px] border-b border-t-accent border-b-line bg-bg">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-7 gap-y-2 px-4 py-3 sm:px-8">
        <HomeLink>
          <span className="grid h-9 w-9 place-items-center bg-accent text-[15px] font-extrabold tracking-tight text-accent-ink" aria-hidden="true">
            GFL
          </span>
          <span className="text-[16px] font-bold tracking-tight text-ink">Analytics</span>
        </HomeLink>
        <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <NavLinks />
        </div>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <div className="hidden md:block">
            <SearchBox />
          </div>
          <FavoriteTeamPicker teams={teams} />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <div className="order-4 w-full md:hidden">
          <SearchBox />
        </div>
      </div>
    </header>
    <FavoriteWelcome teams={teams.filter((t) => t.current)} />
    </>
  );
}

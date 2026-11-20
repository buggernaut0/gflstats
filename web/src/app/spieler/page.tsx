import PlayerSearch from "@/components/PlayerSearch";
import { eliteIndex } from "@/lib/elite";
import { getMeta } from "@/lib/data";
import { T } from "@/i18n/react";

export const metadata = { title: "Spieler" };

export default function PlayersPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink"><T k="playerSearch.title" /></h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2">
        <T k="playerSearch.intro" a={[getMeta().currentSeason, getMeta().seasons[0]]} />
      </p>
      <PlayerSearch elite={eliteIndex()} />
    </main>
  );
}

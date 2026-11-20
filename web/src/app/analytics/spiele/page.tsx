import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import GameSearch from "@/components/GameSearch";
import { T } from "@/i18n/react";

export const metadata = { title: "Advanced Game Search" };

export default function Page() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <AnalyticsCrumb current="analytics.gameSearchPage" />
      <h1 className="display text-[48px] font-bold leading-none tracking-tight text-ink"><T k="analytics.gameSearchPage" /></h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2"><T k="analytics.gameSearchIntro" /></p>
      <GameSearch />
    </main>
  );
}

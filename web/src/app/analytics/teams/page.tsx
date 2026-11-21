import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import TeamSearch from "@/components/TeamSearch";
import { T } from "@/i18n/react";

export const metadata = { title: "Advanced Team Search" };

export default function Page() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-8">
      <AnalyticsCrumb current="analytics.teamSearchPage" />
      <h1 className="display text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[64px]"><T k="analytics.teamSearchPage" /></h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2"><T k="analytics.teamSearchIntro" /></p>
      <TeamSearch />
    </main>
  );
}

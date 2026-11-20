import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import TeamSearch from "@/components/TeamSearch";
import { T } from "@/i18n/react";

export const metadata = { title: "Advanced Team Search" };

export default function Page() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <AnalyticsCrumb current="analytics.teamSearchPage" />
      <h1 className="display text-[48px] font-bold leading-none tracking-tight text-ink"><T k="analytics.teamSearchPage" /></h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2"><T k="analytics.teamSearchIntro" /></p>
      <TeamSearch />
    </main>
  );
}

import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import LeadersView from "@/components/LeadersView";
import { T } from "@/i18n/react";
import { eliteIndex } from "@/lib/elite";

export const metadata = { title: "League Leaders" };

export default function LeadersPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-8">
      <AnalyticsCrumb current="analytics.leadersPage" />
      <h1 className="display text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[64px]">League Leaders</h1>
      <p className="mb-8 mt-3 max-w-[70ch] text-[14px] text-ink-2">
        <T k="analytics.leadersIntro" />
      </p>
      <LeadersView elite={eliteIndex()} />
    </main>
  );
}

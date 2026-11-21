import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import CompareView from "@/components/CompareView";
import { T } from "@/i18n/react";

export const metadata = { title: "Spielervergleich" };

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-8">
      <AnalyticsCrumb current="analytics.comparePage" />
      <h1 className="display text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[64px]"><T k="analytics.comparePage" /></h1>
      <p className="mb-8 mt-3 max-w-[74ch] text-[14px] text-ink-2">
        <T k="analytics.compareIntro" />
      </p>
      <CompareView />
    </main>
  );
}

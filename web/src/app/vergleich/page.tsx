import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import CompareView from "@/components/CompareView";
import { T } from "@/i18n/react";

export const metadata = { title: "Spielervergleich" };

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <AnalyticsCrumb current="analytics.comparePage" />
      <h1 className="display text-[48px] font-bold leading-none tracking-tight text-ink"><T k="analytics.comparePage" /></h1>
      <p className="mb-8 mt-3 max-w-[74ch] text-[14px] text-ink-2">
        <T k="analytics.compareIntro" />
      </p>
      <CompareView />
    </main>
  );
}

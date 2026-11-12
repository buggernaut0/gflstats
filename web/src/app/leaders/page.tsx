import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import LeadersView from "@/components/LeadersView";

export const metadata = { title: "League Leaders" };

export default function LeadersPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <AnalyticsCrumb current="League Leaders" />
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink">League Leaders</h1>
      <p className="mb-8 mt-3 max-w-[70ch] text-[14px] text-ink-2">
        Rangliste für jede Kennzahl, als Saisonwert, beste Einzelsaisons oder Karrierewert seit 2023. Mit * markierte Kennzahlen sind berechnet; Quoten zählen erst ab einem
        Mindestvolumen. Gleiche Werte teilen sich den Rang (2=).
      </p>
      <LeadersView />
    </main>
  );
}

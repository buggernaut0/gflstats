import CompareView from "@/components/CompareView";

export const metadata = { title: "Spielervergleich" };

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[48px] font-bold leading-none tracking-tight text-ink">Spielervergleich</h1>
      <p className="mb-8 mt-3 max-w-[74ch] text-[14px] text-ink-2">
        Bis zu drei Spieler-Saisons im Radar-Chart. Rohwerte sind zwischen Spielern mit unterschiedlich vielen Spielen kaum vergleichbar, deshalb wird jede Achse
        normalisiert: als Perzentil in der Vergleichsgruppe derselben Rolle oder als Anteil am Bestwert. Die Achsen hängen von der Rolle ab.
      </p>
      <CompareView />
    </main>
  );
}

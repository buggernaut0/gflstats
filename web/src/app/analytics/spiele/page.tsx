import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import GameSearch from "@/components/GameSearch";

export const metadata = { title: "Advanced Game Search" };

export default function Page() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <AnalyticsCrumb current="Advanced Game Search" />
      <h1 className="display text-[48px] font-bold leading-none tracking-tight text-ink">Advanced Game Search</h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2">Einzelleistungen in einzelnen Spielen. Bedingungen lassen sich mit UND oder ODER verknüpfen, „zwischen“ setzt Unter- und Obergrenze. Jede Zeile führt zum Spieler und zum Box Score.</p>
      <GameSearch />
    </main>
  );
}

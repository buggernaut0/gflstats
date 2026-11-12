import PlayerSearch from "@/components/PlayerSearch";

export const metadata = { title: "Advanced Player Search" };

export default function Page() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[48px] font-bold leading-none tracking-tight text-ink">Advanced Player Search</h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2">Saison- oder Karrierewerte mit beliebig vielen kombinierten Bedingungen. Beispiel: alle Receiver 2025 mit mindestens 500 Receiving Yards, 5 Touchdowns und mehr als 50 Receptions. Die Abfrage steht in der Adresse und lässt sich als Link teilen.</p>
      <PlayerSearch />
    </main>
  );
}

import PlayerSearch from "@/components/PlayerSearch";

export const metadata = { title: "Spieler" };

export default function PlayersPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink">Spieler</h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2">
        Alle Spieler mit Eintrag in einem Statistikbogen seit 2023, je Saison. Nach Team, Rolle, Saison oder Name filtern, Spalten anklicken zum Sortieren, eigene Bedingungen
        hinzufügen. Rollen sind aus den Statistiken abgeleitet; die Quelle enthält keine Positionen.
      </p>
      <PlayerSearch initialConditions={[]} presets={false} />
    </main>
  );
}

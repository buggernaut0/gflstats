import TeamSearch from "@/components/TeamSearch";

export const metadata = { title: "Advanced Team Search" };

export default function Page() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[48px] font-bold leading-none tracking-tight text-ink">Advanced Team Search</h1>
      <p className="mb-8 mt-3 max-w-[72ch] text-[14px] text-ink-2">Team-Saisons nach Offense, Defense und Effizienz filtern und sortieren. Bis zu drei Team-Saisons lassen sich direkt nebeneinander vergleichen, auch dasselbe Team in verschiedenen Jahren.</p>
      <TeamSearch />
    </main>
  );
}

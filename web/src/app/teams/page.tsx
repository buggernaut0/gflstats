import Link from "next/link";
import { getMeta, getTeamSeasons, getTeams } from "@/lib/data";

export const metadata = { title: "Teams" };

export default function TeamsPage() {
  const ts = getTeamSeasons().filter((t) => t.scope === "regular");
  const seasons = getMeta().seasons;
  const teams = [...getTeams()].sort((a, b) => a.name.localeCompare(b.name, "de"));
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink">Teams</h1>
      <p className="mt-3 max-w-[62ch] text-[14px] text-ink-2">Bilanz in der Regular Season je Saison (Siege–Niederlagen). Leere Felder: Team war in dieser Saison nicht in der GFL vertreten.</p>
      <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-[14px]">
          <caption className="sr-only">Alle Teams mit Bilanz je Saison</caption>
          <thead>
            <tr className="border-b border-line text-[12px] text-ink-3">
              <th scope="col" className="py-2.5 pl-4 text-left font-medium">Team</th>
              {seasons.map((s) => (
                <th key={s} scope="col" className="num px-4 py-2.5 text-right font-medium">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                <td className="py-2.5 pl-4">
                  <Link href={`/teams/${t.id}/`} className="font-medium text-ink hover:underline hover:underline-offset-4">{t.name}</Link>
                </td>
                {seasons.map((s) => {
                  const r = ts.find((x) => x.team === t.id && x.season === s);
                  return (
                    <td key={s} className="num px-4 py-2.5 text-right text-ink-2">
                      {r ? `${r.wins}–${r.losses}${r.ties ? `–${r.ties}` : ""}` : <span className="text-ink-3">·</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

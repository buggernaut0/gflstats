import Link from "next/link";
import TeamLogo from "@/components/TeamLogo";
import { getMeta, getTeamSeasons, getTeams } from "@/lib/data";
import { teamsAttr } from "@/lib/favorite";
import { T } from "@/i18n/react";

export const metadata = { title: "Teams" };

export default function TeamsPage() {
  const ts = getTeamSeasons().filter((t) => t.scope === "regular");
  const seasons = getMeta().seasons;
  const teams = [...getTeams()].sort((a, b) => a.name.localeCompare(b.name, "de"));
  // Kacheln: Teams der aktuellen Saison, nach Bilanz (Siege absteigend, dann Niederlagen)
  const current = getMeta().currentSeason;
  const currentTeams = teams
    .map((team) => ({ team, row: ts.find((x) => x.team === team.id && x.season === current) }))
    .filter((x): x is { team: (typeof teams)[number]; row: (typeof ts)[number] } => !!x.row)
    .sort((a, b) => b.row.wins - a.row.wins || a.row.losses - b.row.losses);
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
      <h1 className="display text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[64px]"><T k="team.listTitle" /></h1>
      <p className="mt-3 max-w-[62ch] text-[14px] text-ink-2"><T k="team.listIntro" /></p>

      <section className="mt-10" aria-labelledby="cur-h">
        <h2 id="cur-h" className="display mb-5 text-[34px] font-bold leading-none tracking-[-0.03em] text-ink"><T k="common.seasonN" a={[current]} /></h2>
        <ul className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 lg:grid-cols-5">
          {currentTeams.map(({ team: t, row: r }) => (
            <li key={t.id} {...teamsAttr(t.id)} className="border-b border-r border-line">
              <Link href={`/teams/${t.id}/`} className="flex h-full flex-col gap-3 p-4 hover:bg-surface">
                <TeamLogo team={t} size={52} />
                <span className="text-[15px] font-semibold leading-snug text-ink">{t.name}</span>
                <span className="mt-auto flex items-baseline justify-between">
                  <span className="num display text-[26px] font-extrabold text-ink">{r.wins}–{r.losses}{r.ties ? `–${r.ties}` : ""}</span>
                  <span className="text-[12px] text-ink-3">{t.abbr}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="display mb-5 mt-14 text-[34px] font-bold leading-none tracking-[-0.03em] text-ink"><T k="analytics.recordCol" /></h2>
      <div className="overflow-x-auto border border-line bg-bg">
        <table className="w-full min-w-[640px] border-collapse text-[14px]">
          <caption className="sr-only"><T k="team.listCaption" /></caption>
          <thead>
            <tr className="border-b border-line text-[12px] text-ink-3">
              <th scope="col" className="py-2.5 pl-4 text-left font-medium"><T k="common.team" /></th>
              {seasons.map((s) => (
                <th key={s} scope="col" className="num px-4 py-2.5 text-right font-medium">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} {...teamsAttr(t.id)} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="py-2.5 pl-4">
                  <span className="flex items-center gap-2.5">
                    <TeamLogo team={t} size={26} />
                    <Link href={`/teams/${t.id}/`} className="font-medium text-ink hover:underline hover:underline-offset-4">{t.name}</Link>
                  </span>
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

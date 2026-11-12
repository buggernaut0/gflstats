import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SourceTag from "@/components/SourceTag";
import { gameMap, getGames, getMeta, getPlayerGames, playerMap, teamMap, teamNameIn } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { formatStat, stat } from "@/lib/stats";
import type { PlayerGame, TeamGameStats } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return getGames().map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const g = gameMap().get(id);
  const t = teamMap();
  return { title: g ? `${t.get(g.away)?.name} @ ${t.get(g.home)?.name}, ${g.date}` : "Spiel" };
}

const SECTIONS: { title: string; when: string[]; cols: string[] }[] = [
  { title: "Passing", when: ["pass"], cols: ["complete", "pass", "passingyards", "touchdownpass", "interception", "longestpass"] },
  { title: "Rushing", when: ["run"], cols: ["run", "runyards", "touchdownrun", "longestrun", "fumbled"] },
  { title: "Receiving", when: ["catched"], cols: ["catched", "receivingyards", "touchdowncatch", "longestcatch"] },
  { title: "Defense", when: ["tackletotal", "sacktotal", "intercepted", "brokenuppass"], cols: ["tackletotal", "tackleforloss", "sacktotal", "intercepted", "brokenuppass", "forcedfumble"] },
  { title: "Kicking", when: ["fieldgoalgood", "patkickgood", "punt", "fieldgoaltry"], cols: ["fieldgoalgood", "longestfieldgoal", "patkickgood", "punt", "puntyards"] },
  { title: "Returns", when: ["kickoffreturn", "puntreturn"], cols: ["kickoffreturn", "kickoffreturnyards", "puntreturn", "puntreturnyards"] },
];

const TEAM_ROWS: { label: string; get: (t: TeamGameStats) => string | null }[] = [
  { label: "Lauf: Versuche / Yards", get: (t) => (t.rushAtt !== undefined ? `${t.rushAtt} / ${t.rushYds ?? 0}` : null) },
  { label: "Pass: Completions / Versuche / Yards", get: (t) => (t.passAtt !== undefined ? `${t.passCmp ?? 0} / ${t.passAtt} / ${t.passYds ?? 0}` : null) },
  { label: "3rd Downs: erfolgreich / Versuche", get: (t) => (t.thirdAtt !== undefined ? `${t.thirdConv ?? 0} / ${t.thirdAtt}` : null) },
  { label: "4th Downs: erfolgreich / Versuche", get: (t) => (t.fourthAtt !== undefined ? `${t.fourthConv ?? 0} / ${t.fourthAtt}` : null) },
  { label: "Red Zone: Touchdowns / Besuche", get: (t) => (t.redzone !== undefined ? `${t.redzoneTd ?? 0} / ${t.redzone}` : null) },
];

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = gameMap().get(id);
  if (!g) notFound();
  const teams = teamMap();
  const players = playerMap();
  const meta = getMeta();
  const rows = getPlayerGames(g.season).filter((r) => r.g === id);
  const name = (t: string) => {
    const team = teams.get(t);
    return team ? teamNameIn(team, g.season) : t;
  };
  const avail = (k: string) => stat(k).needs.every((f) => meta.availability[f]?.includes(g.season));
  const homeWon = g.homeScore > g.awayScore;

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <p className="text-[14px] text-ink-3">
        {fmtDate(g.date)}, {g.type === "playoff" ? "Playoffs" : "Regular Season"} {g.season}
        {g.name && !/ (at|vs\.?) /.test(g.name) && <>, {g.name}</>}
      </p>
      <section className="mt-3 grid max-w-[760px] grid-cols-[1fr_auto_1fr] items-center gap-6 rounded-xl border border-line-strong bg-surface px-6 py-5" aria-label="Endstand">
        <TeamScore id={g.away} name={name(g.away)} score={g.awayScore} won={!homeWon && g.awayScore !== g.homeScore} label="Gast" />
        <span className="display text-[22px] text-ink-3">@</span>
        <TeamScore id={g.home} name={name(g.home)} score={g.homeScore} won={homeWon} label="Heim" right />
      </section>

      <section className="mt-12" aria-labelledby="team-h">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="team-h" className="display text-[26px] font-bold leading-none tracking-tight text-ink">
            Teamstatistik
          </h2>
          <SourceTag kind="original" detail="Teamstatistik der Quelle je Spiel" />
        </div>
        <div className="max-w-[760px] overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-ink-3">
                <th scope="col" className="py-2 pl-4 text-left font-medium">Kennzahl</th>
                <th scope="col" className="py-2 text-right font-medium">{teams.get(g.away)?.abbr}</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">{teams.get(g.home)?.abbr}</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_ROWS.map((r) => {
                const a = r.get(g.teamStats[g.away] ?? {});
                const h = r.get(g.teamStats[g.home] ?? {});
                if (a === null && h === null) return null;
                return (
                  <tr key={r.label} className="border-b border-line last:border-0">
                    <td className="py-2 pl-4 text-ink-2">{r.label}</td>
                    <td className="num py-2 text-right text-ink">{a ?? "–"}</td>
                    <td className="num py-2 pr-4 text-right text-ink">{h ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-12 grid gap-10 xl:grid-cols-2">
        {[g.away, g.home].map((t) => (
          <section key={t} aria-label={`Spielerstatistik ${name(t)}`}>
            <h2 className="display mb-4 text-[26px] font-bold leading-none tracking-tight">
              <Link href={`/teams/${t}/`} className="text-ink hover:underline hover:underline-offset-4">
                {name(t)}
              </Link>
            </h2>
            {SECTIONS.map((sec) => {
              const list = rows.filter((r) => r.t === t && sec.when.some((w) => (r.s[w] ?? 0) > 0)).sort((a, b) => (b.s[sec.cols[1]] ?? 0) + (b.s[sec.cols[0]] ?? 0) - (a.s[sec.cols[1]] ?? 0) - (a.s[sec.cols[0]] ?? 0));
              if (!list.length) return null;
              return <Box key={sec.title} title={sec.title} cols={sec.cols} rows={list} players={players} avail={avail} />;
            })}
          </section>
        ))}
      </div>
    </main>
  );
}

function TeamScore({ id, name, score, won, label, right }: { id: string; name: string; score: number; won: boolean; label: string; right?: boolean }) {
  return (
    <div className={right ? "text-right" : ""}>
      <p className="text-[12px] text-ink-3">{label}</p>
      <Link href={`/teams/${id}/`} className={`display block text-[22px] leading-tight hover:underline hover:underline-offset-4 ${won ? "font-semibold text-ink" : "text-ink-2"}`}>
        {name}
      </Link>
      <p className={`num display text-[48px] font-bold leading-none ${won ? "text-ink" : "text-ink-3"}`}>{score}</p>
    </div>
  );
}

function Box({ title, cols, rows, players, avail }: { title: string; cols: string[]; rows: PlayerGame[]; players: Map<string, { name: string }>; avail: (k: string) => boolean }) {
  return (
    <div className="mb-5">
      <h3 className="mb-1.5 text-[14px] font-semibold text-ink-2">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[12px] text-ink-3">
              <th scope="col" className="py-1.5 pl-4 text-left font-medium">Spieler</th>
              {cols.map((c) => (
                <th key={c} scope="col" title={stat(c).label} className="px-2 py-1.5 text-right font-medium last:pr-4">
                  {stat(c).abbr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.p} className="border-b border-line last:border-0">
                <td className="py-1.5 pl-4">
                  <Link href={`/spieler/${r.p}/`} className="text-ink hover:underline hover:underline-offset-4">
                    {players.get(r.p)?.name ?? r.p}
                  </Link>
                </td>
                {cols.map((c) => (
                  <td key={c} className="num px-2 py-1.5 text-right text-ink last:pr-4">
                    {avail(c) ? formatStat(stat(c), r.s[c] ?? 0) : <span className="text-[12px] text-ink-3">n. e.</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

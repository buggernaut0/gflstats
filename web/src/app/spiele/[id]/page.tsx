import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GamePoster from "@/components/GamePoster";
import SourceTag from "@/components/SourceTag";
import VideoPlayer from "@/components/VideoPlayer";
import TeamLogo from "@/components/TeamLogo";
import { playoffRound, toTeamLite, type TeamLite } from "@/lib/dashboard";
import { gameMap, getGames, getMeta, getPlayerGames, playerMap, teamMap, teamNameIn } from "@/lib/data";
import { fmtShortDate } from "@/lib/format";
import { stat } from "@/lib/stats";
import { DateText, StatLabel, StatValue, T, Titled } from "@/i18n/react";
import { PlayoffRound } from "@/components/I18nBits";
import type { PlayerGame, TeamGameStats } from "@/lib/types";
import { teamsAttr } from "@/lib/favorite";

export const dynamicParams = false;

export function generateStaticParams() {
  return getGames().map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const g = gameMap().get(id);
  const t = teamMap();
  if (!g) return { title: "Spiel" };
  const nm = (id: string) => (t.get(id) ? teamNameIn(t.get(id)!, g.season) : id);
  return { title: `${nm(g.away)} @ ${nm(g.home)} ${g.awayScore}:${g.homeScore}, ${fmtShortDate(g.date)}${g.season}` };
}

const SECTIONS: { title: string; when: string[]; cols: string[] }[] = [
  { title: "Passing", when: ["pass"], cols: ["complete", "pass", "passingyards", "touchdownpass", "interception", "longestpass"] },
  { title: "Rushing", when: ["run"], cols: ["run", "runyards", "touchdownrun", "longestrun", "fumbled"] },
  { title: "Receiving", when: ["catched"], cols: ["catched", "receivingyards", "touchdowncatch", "longestcatch"] },
  { title: "Defense", when: ["tackletotal", "sacktotal", "intercepted", "brokenuppass"], cols: ["tackletotal", "tackleforloss", "sacktotal", "intercepted", "brokenuppass", "forcedfumble"] },
  { title: "Kicking", when: ["fieldgoalgood", "patkickgood", "punt", "fieldgoaltry"], cols: ["fieldgoalgood", "longestfieldgoal", "patkickgood", "punt", "puntyards"] },
  { title: "Returns", when: ["kickoffreturn", "puntreturn"], cols: ["kickoffreturn", "kickoffreturnyards", "puntreturn", "puntreturnyards"] },
];

const TEAM_ROWS: { label: string; key: string; get: (t: TeamGameStats) => string | null }[] = [
  { label: "Lauf: Versuche / Yards", key: "rush", get: (t) => (t.rushAtt !== undefined ? `${t.rushAtt} / ${t.rushYds ?? 0}` : null) },
  { label: "Pass: Completions / Versuche / Yards", key: "pass", get: (t) => (t.passAtt !== undefined ? `${t.passCmp ?? 0} / ${t.passAtt} / ${t.passYds ?? 0}` : null) },
  { label: "3rd Downs: erfolgreich / Versuche", key: "third", get: (t) => (t.thirdAtt !== undefined ? `${t.thirdConv ?? 0} / ${t.thirdAtt}` : null) },
  { label: "4th Downs: erfolgreich / Versuche", key: "fourth", get: (t) => (t.fourthAtt !== undefined ? `${t.fourthConv ?? 0} / ${t.fourthAtt}` : null) },
  { label: "Red Zone: Touchdowns / Besuche", key: "redzone", get: (t) => (t.redzone !== undefined ? `${t.redzoneTd ?? 0} / ${t.redzone}` : null) },
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
  const lite = (t: string) => (teams.get(t) ? toTeamLite(teams.get(t)!, name(t)) : undefined);

  // Direkter Vergleich: alle Spiele dieser beiden Teams in den erfassten Saisons, neueste zuerst
  const pair = new Set([g.home, g.away]);
  const meetings = getGames()
    .filter((x) => pair.has(x.home) && pair.has(x.away) && x.home !== x.away)
    .sort((a, b) => b.date.localeCompare(a.date));
  const [ta, tb] = [g.away, g.home];
  const scoreOf = (x: (typeof meetings)[number], t: string) => (x.home === t ? x.homeScore : x.awayScore);
  const winsA = meetings.filter((x) => scoreOf(x, ta) > scoreOf(x, tb)).length;
  const winsB = meetings.filter((x) => scoreOf(x, tb) > scoreOf(x, ta)).length;
  const ptsA = meetings.reduce((n, x) => n + scoreOf(x, ta), 0);
  const ptsB = meetings.reduce((n, x) => n + scoreOf(x, tb), 0);
  const colorA = teams.get(ta)?.colors?.primary ?? "var(--ink-3)";
  const colorB = teams.get(tb)?.colors?.primary ?? "var(--accent)";

  return (
    <>
    <section className="border-b border-line bg-surface" aria-label={`${name(g.away)} @ ${name(g.home)}`}>
      <div className="mx-auto max-w-[1280px] px-4 pb-11 pt-9 sm:px-8">
        <p className="label-caps text-center text-[12px] text-accent-text">
          {playoffRound(g) ? <PlayoffRound name={playoffRound(g)!} /> : <T k={g.type === "playoff" ? "common.playoffs" : "common.regularSeason"} />}
          <span className="text-ink-3"> · <DateText iso={g.date} /> · {g.season}</span>
        </p>
        <div className="mx-auto mt-6 grid max-w-[1000px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:gap-8">
          <TeamScore id={g.away} team={lite(g.away)} name={name(g.away)} won={!homeWon && g.awayScore !== g.homeScore} label={<T k="games.awayTeam" />} />
          <div className="flex items-center gap-3 sm:gap-5">
            <span className={`num display text-[40px] leading-none sm:text-[112px] ${!homeWon && g.awayScore !== g.homeScore ? "font-extrabold text-ink" : "font-bold text-ink-3"}`}>{g.awayScore}</span>
            <span className="h-[3px] w-3 bg-line-strong opacity-40 sm:w-4" aria-hidden="true" />
            <span className={`num display text-[40px] leading-none sm:text-[112px] ${homeWon ? "font-extrabold text-ink" : "font-bold text-ink-3"}`}>{g.homeScore}</span>
          </div>
          <TeamScore id={g.home} team={lite(g.home)} name={name(g.home)} won={homeWon} label={<T k="games.homeTeam" />} />
        </div>
      </div>
    </section>
    <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-12 sm:px-8">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <section aria-labelledby="team-h">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 id="team-h" className="display text-[34px] font-bold leading-none tracking-[-0.03em] text-ink">
                <T k="games.teamStats" />
              </h2>
              <SourceTag kind="original" detail="games.teamStatsDetail" />
            </div>
            <div className="overflow-x-auto border border-line bg-bg">
              <table className="data-table w-full border-collapse text-[14px]">
                <thead>
                  <tr>
                    <th scope="col" className="py-2.5 pl-4 text-left"><T k="games.colStat" /></th>
                    <th scope="col" className="py-2.5 text-right">{teams.get(g.away)?.abbr}</th>
                    <th scope="col" className="py-2.5 pr-4 text-right">{teams.get(g.home)?.abbr}</th>
                  </tr>
                </thead>
                <tbody>
                  {TEAM_ROWS.map((r) => {
                    const a = r.get(g.teamStats[g.away] ?? {});
                    const h = r.get(g.teamStats[g.home] ?? {});
                    if (a === null && h === null) return null;
                    return (
                      <tr key={r.label}>
                        <td className="py-2.5 pl-4 text-ink-2"><T k={`games.rows.${r.key}` as "games.title"} /></td>
                        <td className="num py-2.5 text-right text-ink">{a ?? "–"}</td>
                        <td className="num py-2.5 pr-4 text-right text-ink">{h ?? "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
          <section className="max-w-[600px]" aria-labelledby="hl-h">
            <h2 id="hl-h" className="display mb-4 text-[34px] font-bold leading-none tracking-[-0.03em] text-ink">
              <T k="games.highlights" />
            </h2>
            {g.video ? (
              <VideoPlayer youtubeId={g.video.youtubeId} title={g.video.title} channel={g.video.channel} meta={g.video.published ? g.video.published : undefined}>
                <GamePoster away={lite(g.away)} home={lite(g.home)} label="Highlights" />
              </VideoPlayer>
            ) : (
              <p className="border border-dashed border-line bg-surface px-4 py-8 text-center text-[13.5px] text-ink-3"><T k="games.noVideo" /></p>
            )}
          </section>
      </div>

      <div className="mt-12 grid gap-10 xl:grid-cols-2">
        {[g.away, g.home].map((t) => (
          <section key={t}>
            <h2 className="display mb-4 text-[34px] font-bold leading-none tracking-[-0.03em]">
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

      <section className="mt-16 grid items-start gap-10 lg:grid-cols-[minmax(0,380px)_1fr]" aria-labelledby="h2h-h">
        <div>
          <h2 id="h2h-h" className="display text-[34px] font-bold leading-none tracking-[-0.03em] text-ink"><T k="games.h2hTitle" /></h2>
          <p className="mt-2 text-[13.5px] text-ink-2">
            {meetings.length > 1 ? <T k="games.h2hNote" a={[meetings.length, meta.seasons[0]]} /> : <T k="games.h2hNone" />}
          </p>
          {meetings.length > 1 && (
            <>
              <div className="mt-5 grid grid-cols-2 border-t-2 border-line-strong pt-3">
                <div>
                  <p className="flex items-center gap-2 text-[13px] text-ink-3"><TeamLogo team={lite(ta)} size={20} /><T k="games.h2hWins" a={[teams.get(ta)?.short ?? name(ta)]} /></p>
                  <p className="num display text-[56px] font-extrabold leading-tight text-ink">{winsA}</p>
                  <p className="num text-[12.5px] text-ink-3"><T k="games.h2hPoints" a={[ptsA]} /></p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-2 text-[13px] text-ink-3"><T k="games.h2hWins" a={[teams.get(tb)?.short ?? name(tb)]} /><TeamLogo team={lite(tb)} size={20} /></p>
                  <p className="num display text-[56px] font-extrabold leading-tight text-ink">{winsB}</p>
                  <p className="num text-[12.5px] text-ink-3"><T k="games.h2hPoints" a={[ptsB]} /></p>
                </div>
              </div>
              <div className="mt-3 flex h-2.5 gap-0.5" role="img" aria-label={`${winsA} : ${winsB}`}>
                <span style={{ flex: Math.max(winsA, 0.001), background: colorA }} />
                <span style={{ flex: Math.max(winsB, 0.001), background: colorB }} />
              </div>
            </>
          )}
        </div>
        {meetings.length > 1 && (
          <div className="overflow-x-auto border border-line bg-bg">
            <table className="data-table w-full min-w-[520px] border-collapse text-[14px]">
              <thead>
                <tr>
                  <th scope="col" className="py-2.5 pl-4 text-left"><T k="common.date" /></th>
                  <th scope="col" className="py-2.5 text-left"><T k="common.game" /></th>
                  <th scope="col" className="py-2.5 text-right">{teams.get(ta)?.abbr}</th>
                  <th scope="col" className="py-2.5 text-right">{teams.get(tb)?.abbr}</th>
                  <th scope="col" className="w-16 py-2.5 pr-4" />
                </tr>
              </thead>
              <tbody>
                {meetings.map((x) => {
                  const a = scoreOf(x, ta);
                  const b = scoreOf(x, tb);
                  const winner = a > b ? ta : b > a ? tb : null;
                  const current = x.id === g.id;
                  return (
                    <tr key={x.id} className={current ? "bg-accent-soft" : ""}>
                      <td className="num py-2.5 pl-4 text-ink-2"><DateText iso={x.date} /></td>
                      <td className="py-2.5">
                        <Link href={`/spiele/${x.id}/`} className={`hover:underline hover:underline-offset-4 ${x.type === "playoff" ? "font-semibold text-ink" : "text-ink"}`}>
                          {playoffRound(x) ? <PlayoffRound name={playoffRound(x)!} /> : <T k="common.regularSeason" />}
                        </Link>
                        {current && <span className="ml-2 text-[12px] text-accent-text"><T k="games.h2hThis" /></span>}
                      </td>
                      <td className={`num display py-2.5 text-right text-[18px] ${winner === ta ? "font-extrabold text-ink" : "font-medium text-ink-3"}`}>{a}</td>
                      <td className={`num display py-2.5 text-right text-[18px] ${winner === tb ? "font-extrabold text-ink" : "font-medium text-ink-3"}`}>{b}</td>
                      <td className="py-2.5 pr-4 text-right">
                        {winner && (
                          <span className="inline-block min-w-[40px] px-1.5 py-[2px] text-center text-[11px] font-bold text-white" style={{ background: teams.get(winner)?.colors?.primary ?? "var(--navy)" }}>
                            {teams.get(winner)?.abbr}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
    </>
  );
}

function TeamScore({ id, team, name, won, label }: { id: string; team?: TeamLite; name: string; won: boolean; label: React.ReactNode }) {
  return (
    <Link href={`/teams/${id}/`} className="group flex flex-col items-center gap-2.5 text-center">
      <TeamLogo team={team} size={84} className="max-sm:hidden" />
      <TeamLogo team={team} size={52} className="sm:hidden" />
      <span className={`display hyphens-auto break-words text-[16px] leading-tight group-hover:underline group-hover:underline-offset-4 sm:text-[30px] ${won ? "font-extrabold text-ink" : "font-semibold text-ink-2"}`}>{name}</span>
      <span className={`text-[12.5px] ${won ? "font-semibold text-accent-text" : "text-ink-3"}`}>{label}</span>
    </Link>
  );
}

function Box({ title, cols, rows, players, avail }: { title: string; cols: string[]; rows: PlayerGame[]; players: Map<string, { name: string }>; avail: (k: string) => boolean }) {
  return (
    <div className="mb-5">
      <h3 className="label-caps mb-2 text-ink-2"><T k={`games.sections.${title}` as "games.title"} /></h3>
      <div className="overflow-x-auto border border-line bg-bg">
        <table className="data-table w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th scope="col" className="py-2 pl-4 text-left"><T k="common.player" /></th>
              {cols.map((c) => (
                <th key={c} scope="col" className="px-2 py-2 text-right last:pr-4">
                  <Titled stat={c}><StatLabel k={c} abbr /></Titled>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.p} {...teamsAttr(r.t)}>
                <td className="py-1.5 pl-4">
                  <Link href={`/spieler/${r.p}/`} className="text-ink hover:underline hover:underline-offset-4">
                    {players.get(r.p)?.name ?? r.p}
                  </Link>
                </td>
                {cols.map((c) => (
                  <td key={c} className="num px-2 py-1.5 text-right text-ink last:pr-4">
                    {avail(c) ? <StatValue k={c} v={r.s[c] ?? 0} /> : <span className="text-[12px] text-ink-3"><T k="common.notRecorded" /></span>}
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GameLog, { type LogRow } from "@/components/GameLog";
import PlayerStats, { type SplitRow } from "@/components/PlayerStats";
import { FavBadge } from "@/components/FavoriteTeam";
import ProfileRadar from "@/components/ProfileRadar";
import SourceTag from "@/components/SourceTag";
import TeamLogo from "@/components/TeamLogo";
import TeamTag from "@/components/TeamTag";
import Videos from "@/components/Videos";
import EliteBadge from "@/components/EliteBadge";
import { eliteSeason } from "@/lib/elite";
import { toTeamLite, type TeamLite } from "@/lib/dashboard";
import { gameMap, getMeta, getPlayers, getTeams, leagueRank, playerGameRows, playerMap, teamNameIn } from "@/lib/data";
import { teamsAttr } from "@/lib/favorite";
import { axesFor, comparisonGroup, qualified, type Entry } from "@/lib/profile";
import { allEntries } from "@/lib/serverCache";
import { ROLE_HEADLINE, ROLE_MIN, addStats, stat, statAvailable, value } from "@/lib/stats";
import { Num, StatLabel, StatValue, T, Titled } from "@/i18n/react";
import { RoleName, QualifierText, StatFormula, EliteGroup, SourceNames } from "@/components/I18nBits";
import { GAMELOG_COLS } from "@/lib/tables";
import type { Scope, Stats } from "@/lib/types";
import SeasonNotice from "@/components/SeasonNotice";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPlayers().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: playerMap().get(id)?.name ?? "Spieler" };
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = playerMap().get(id);
  if (!p) notFound();
  const meta = getMeta();
  const games = gameMap();
  const lastSeason = p.seasons[p.seasons.length - 1];
  const teams: Record<string, TeamLite> = Object.fromEntries(
    getTeams().map((t) => [t.id, toTeamLite(t, teamNameIn(t, lastSeason.season))]),
  );

  // Rolle: die abgeleitete Rolle mit den meisten Spielen; bei Gleichstand die juengste
  const roleCount = new Map<string, number>();
  for (const s of [...p.seasons].reverse()) if (s.role) roleCount.set(s.role, (roleCount.get(s.role) ?? 0) + s.games);
  const role = [...roleCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Saison x Team x Phase aus den Spielzeilen
  const rows = playerGameRows(id);
  const split = new Map<string, SplitRow>();
  const log: LogRow[] = [];
  for (const r of rows) {
    const g = games.get(r.g)!;
    for (const scope of ["all", g.type] as Scope[]) {
      const key = `${g.season}|${r.t}|${scope}`;
      const e = split.get(key) ?? { season: g.season, team: r.t, scope, games: 0, stats: {} };
      e.games += 1;
      addStats(e.stats, r.s);
      split.set(key, e);
    }
    const home = g.home === r.t;
    log.push({
      game: g.id, season: g.season, date: g.date, playoff: g.type === "playoff", team: r.t, opponent: home ? g.away : g.home, home,
      teamScore: home ? g.homeScore : g.awayScore, oppScore: home ? g.awayScore : g.homeScore, stats: r.s,
    });
  }
  const career: Stats = {};
  rows.forEach((r) => addStats(career, r.s));
  const careerGames = rows.length;

  // Perzentil-Profil: juengste Saison in der Rolle, bevorzugt eine mit erfuelltem Mindestvolumen
  const mine = allEntries().filter((e) => e.player === id && e.role === role);
  const profileEntry = role ? [...mine].reverse().find((e) => qualified(e, role)) ?? mine[mine.length - 1] : undefined;
  const axes = profileEntry && role ? axesFor(profileEntry, role, comparisonGroup(allEntries(), role, profileEntry.season), meta.availability) : [];
  const inGroup = profileEntry && role ? qualified(profileEntry, role) : false;

  const headline = role ? ROLE_HEADLINE[role] : ["touchdown", "points"];
  const allTeams = [...new Set(p.seasons.flatMap((s) => s.teams))];
  const currentTeams = lastSeason.teams;
  // Logo im Kopf: Team mit den meisten Spielen in der letzten Saison des Spielers
  const mainTeam = [...currentTeams].sort((a, b) => (split.get(`${lastSeason.season}|${b}|all`)?.games ?? 0) - (split.get(`${lastSeason.season}|${a}|all`)?.games ?? 0))[0];
  const formerTeams = allTeams.filter((t) => !currentTeams.includes(t));
  // Elite: jüngste Saison, in der der Spieler zu den besten zehn seiner Positionsgruppe gehörte (lib/elite.ts)
  const eliteNow = [...p.seasons]
    .map((s) => s.season)
    .sort((a, b) => b - a)
    .map((season) => ({ season, entries: eliteSeason(season).get(p.id) ?? [] }))
    .find((x) => x.entries.length > 0);
  const span = p.seasons.length > 1 ? `${p.seasons[0].season}–${lastSeason.season}` : String(lastSeason.season);

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <section className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_auto]">
        <div className="flex items-start gap-5">
          {mainTeam && teams[mainTeam]?.logo ? <TeamLogo team={teams[mainTeam]} size={88} /> : <Avatar name={p.name} />}
          <div>
            <h1 className="display text-[44px] font-bold leading-none tracking-tight text-ink sm:text-[56px]">{p.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-ink-2">
              {role ? (
                <span>
                  <RoleName role={role} /> <span className="text-ink-3"><T k="player.derivedRole" /></span>
                </span>
              ) : (
                <span className="text-ink-3"><T k="player.roleUnclear" /></span>
              )}
              <span {...teamsAttr(currentTeams)} className="fav-plain contents">
                <FavBadge />
              </span>
              {currentTeams.map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <TeamTag team={teams[t]} />
                  <Link href={`/teams/${t}/`} className="text-ink hover:underline hover:underline-offset-4">
                    {teams[t]?.name}
                  </Link>
                </span>
              ))}
            </p>
            {eliteNow && (
              <p className="mt-3.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                {eliteNow.entries.map((e) => (
                  <EliteBadge key={e.profile} entry={e} size="md" season={eliteNow.season} />
                ))}
                <span>
                  <T k="player.eliteLine" a={[eliteNow.season]} />
                  {eliteNow.entries.length === 1 && <EliteGroup entry={eliteNow.entries[0]} />}
                </span>
              </p>
            )}
            {p.shared && <p className="mt-2 text-[13.5px] text-ink-3"><T k="player.shared" /></p>}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[13.5px] sm:grid-cols-3 lg:w-[480px]">
          <Info label={<T k="player.seasons" />} value={`${span} (${p.seasons.length})`} />
          <Info label={<T k="player.games" />} value={<Num v={careerGames} />} hint="player.gamesHint" />
          <Info label={<T k={lastSeason.season === meta.currentSeason ? "player.currentTeam" : "player.lastTeam"} />} value={currentTeams.map((t) => teams[t]?.short).join(", ")} hint="player.asOfSeason" hintArgs={[lastSeason.season]} />
          <Info label={<T k="player.formerTeams" />} value={formerTeams.length ? formerTeams.map((t) => teams[t]?.short).join(", ") : "–"} />
          <Info label={<T k="player.jersey" />} value={<T k="player.noInfo" />} muted />
          <Info label={<T k="player.sizeWeight" />} value={<T k="player.noInfo" />} muted />
        </dl>
      </section>

      {lastSeason.season < meta.currentSeason && (
        <div className="mt-8">
          <SeasonNotice current={meta.currentSeason} latest={lastSeason.season} subject="player" />
        </div>
      )}

      <section aria-labelledby="karriere-h" className="mt-10">
        <Head id="karriere-h" title={<T k="player.careerTitle" a={[meta.seasons[0]]} />} note={<T k="player.careerNote" a={[lastSeason.season]} />}>
          <SourceTag kind="original" />
          <SourceTag kind="rank" />
        </Head>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {headline.map((k) => {
            const d = stat(k);
            const anyAvail = p.seasons.some((s) => statAvailable(d, s.season, meta.availability));
            const rank = d.kind === "original" ? leagueRank(k, lastSeason.season, id) : null;
            return (
              <Titled key={k} as="div" stat={k} className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-[12.5px] text-ink-3"><StatLabel k={k} /></p>
                <p className="num display mt-0.5 text-[30px] font-semibold leading-tight text-ink">{anyAvail ? <StatValue k={k} v={value(d, career, careerGames)} /> : <T k="common.notRecorded" />}</p>
                <p className="text-[12px] text-ink-3">{rank ? <T k="player.seasonRank" a={[lastSeason.season, rank.rank, rank.of]} /> : d.kind === "derived" ? <T k="common.derivedMark" /> : " "}</p>
              </Titled>
            );
          })}
        </div>
      </section>

      {role && profileEntry && axes.length > 0 && (
        <section aria-labelledby="profil-h" className="mt-14">
          <Head
            id="profil-h"
            title={<T k="player.profileTitle" a={[profileEntry.season]} />}
            note={<><QualifierText role={role} season={profileEntry.season} n={axes[0]?.groupSize ?? 0} /></>}
          >
            <SourceTag kind="derived" detail="player.midrank" />
          </Head>
          {!inGroup && (
            <p className="mb-4 max-w-[70ch] rounded-lg border border-dashed border-line px-4 py-2.5 text-[13.5px] text-ink-2">
              <T k="player.notInGroup" a={[p.name, profileEntry.season]} />
            </p>
          )}
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,560px)_1fr]">
            <ProfileRadar name={p.name} axes={axes.map((a) => ({ key: a.key, pct: a.pct, value: a.available ? a.value : null }))} />
            <div>
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-line text-[12px] text-ink-3">
                    <th scope="col" className="py-2 text-left font-medium"><T k="player.colStat" /></th>
                    <th scope="col" className="py-2 text-right font-medium"><T k="player.colValue" /></th>
                    <th scope="col" className="py-2 text-right font-medium"><T k="player.colMedian" /></th>
                    <th scope="col" className="py-2 pl-4 text-right font-medium"><T k="player.colPct" /></th>
                  </tr>
                </thead>
                <tbody>
                  {axes.map((a) => (
                    <tr key={a.key} className="border-b border-line last:border-0">
                      <Titled as="td" stat={a.key} className="py-2 text-ink">
                        <StatLabel k={a.key} />
                        {a.lowerIsBetter && <span className="ml-1 text-[12px] text-ink-3"><T k="player.lowerBetter" /></span>}
                      </Titled>
                      <td className="num py-2 text-right text-ink">{a.available ? <StatValue k={a.key} v={a.value} /> : <T k="common.notRecorded" />}</td>
                      <td className="num py-2 text-right text-ink-2"><StatValue k={a.key} v={a.median} /></td>
                      <td className="num py-2 pl-4 text-right font-semibold text-ink">{a.pct === null ? "–" : Math.round(a.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link href={`/vergleich/?p=${id}:${profileEntry.season}`} className="mt-4 inline-block rounded-md border border-line px-3 py-1.5 text-[14px] text-ink hover:border-line-strong">
                <T k="player.compareLink" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {role && p.seasons.length > 1 && <Development role={role} seasons={allEntries().filter((e) => e.player === id)} availability={meta.availability} />}

      <section aria-labelledby="stats-h" className="mt-14">
        <Head id="stats-h" title={<T k="player.statsTitle" />} note={<T k="player.statsNote" />}>
          <SourceTag kind="original" />
          <SourceTag kind="derived" detail="player.ratesDetail" />
        </Head>
        <PlayerStats rows={[...split.values()]} teams={teams} availability={meta.availability} hasPlayoffs={rows.some((r) => games.get(r.g)!.type === "playoff")} />
      </section>

      <section aria-labelledby="log-h" className="mt-14">
        <Head id="log-h" title={<T k="player.logTitle" />} note={<T k="player.logNote" />} />
        <GameLog rows={log} cols={GAMELOG_COLS[role ?? "default"] ?? GAMELOG_COLS.default} teams={teams} availability={meta.availability} />
      </section>

      <section aria-labelledby="video-h" className="mt-14">
        <Head id="video-h" title={<T k="player.videosTitle" />} note={<T k="player.videosNote" />} />
        <Videos videos={p.videos} />
      </section>

      {p.sourceNames.length > 1 && (
        <p className="mt-12 max-w-[70ch] text-[13px] text-ink-3">
          <SourceNames names={p.sourceNames.map((n) => n.trim())} />{" "}
          <Link href="/methodik/#spieler" className="underline underline-offset-4">
            <T k="player.whyMerged" />
          </Link>
        </p>
      )}
    </main>
  );
}

function Development({ role, seasons, availability }: { role: string; seasons: Entry[]; availability: Record<string, number[]> }) {
  const key = ({ QB: "passYdsPg", RB: "rushYdsPg", "WR/TE": "recYdsPg", DEF: "tklPg", K: "fieldgoalgood", P: "puntAvg" } as Record<string, string>)[role] ?? "tdPg";
  const d = stat(key);
  const pts = seasons.map((e) => ({ season: e.season, v: statAvailable(d, e.season, availability) ? value(d, e.stats, e.games) : null, games: e.games }));
  const max = Math.max(1, ...pts.map((x) => x.v ?? 0));
  return (
    <section aria-labelledby="dev-h" className="mt-14">
      <Head id="dev-h" title={<T k="player.devTitle" />} note={<StatFormula k={key} kind="dev" />}>
        <SourceTag kind="derived" />
      </Head>
      <div className="flex max-w-[640px] items-end gap-4 rounded-xl border border-line bg-surface px-5 pb-4 pt-6" role="img">
        {pts.map((x) => (
          <div key={x.season} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="num display text-[17px] font-semibold text-ink"><StatValue k={key} v={x.v} /></span>
            <div className="flex h-[120px] w-full max-w-[64px] items-end">
              <div className="w-full rounded-t-[4px]" style={{ height: `${((x.v ?? 0) / max) * 100}%`, background: "var(--bar)" }} />
            </div>
            <span className="num text-[13px] text-ink-2">{x.season}</span>
            <span className="text-[11.5px] text-ink-3"><T k="player.gamesShort" a={[x.games]} /></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Head({ id, title, note, children }: { id: string; title: React.ReactNode; note?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-[78ch]">
        <h2 id={id} className="display text-[28px] font-bold leading-none tracking-tight text-ink">
          {title}
        </h2>
        {note && <p className="mt-2 text-[13.5px] text-ink-2">{note}</p>}
      </div>
      {children && <div className="flex gap-1.5">{children}</div>}
    </div>
  );
}

function Info({ label, value, hint, hintArgs, muted }: { label: React.ReactNode; value: React.ReactNode; hint?: "player.gamesHint" | "player.asOfSeason"; hintArgs?: unknown[]; muted?: boolean }) {
  return (
    <Titled as="div" k={hint} a={hintArgs}>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className={muted ? "text-ink-3" : "text-ink"}>{value || "–"}</dd>
    </Titled>
  );
}

/** Neutraler Platzhalter statt Spielerfoto: Initialen auf Trikot-Silhouette. */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s/-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" className="shrink-0">
      <rect width="88" height="88" rx="16" fill="var(--surface-2)" stroke="var(--line)" />
      <path d="M26 30l10-8h16l10 8 8 10-9 6-5-5v31H32V41l-5 5-9-6z" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="1.2" strokeLinejoin="round" />
      <text x="44" y="64" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--ink-2)" fontFamily="Barlow Condensed, sans-serif">
        {initials}
      </text>
    </svg>
  );
}

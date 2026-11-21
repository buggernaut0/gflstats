import Link from "next/link";
import {
  DASHBOARD_CATEGORIES,
  leaders,
  playoffRound,
  seasonFacts,
  seasonFinal,
  seasonHighlights,
  teamTable,
  toTeamLite,
  topPerformances,
  type TeamLite,
} from "@/lib/dashboard";
import { getGames, getMeta, getPlayerGames, getPlayerSeasons, getTeamSeasons, getTeams, isAvailable, playerMap, teamNameIn } from "@/lib/data";
import { DateText, Num, T, Titled } from "@/i18n/react";
import { PlayoffRound, SourceLine } from "./I18nBits";
import type { Game, Scope } from "@/lib/types";
import DashboardBody, { type DashboardData } from "./DashboardBody";
import GamePoster from "./GamePoster";
import TeamLogo from "./TeamLogo";
import { BreakoutSection, RoleIndexSection } from "./ModelSections";
import { VideoMark } from "./VideoPlayer";
import { breakouts, roleIndexRows } from "@/lib/insights";
import { allEntries } from "@/lib/serverCache";

const SCOPES: Scope[] = ["regular", "playoff", "all"];

export default function SeasonDashboard({ season }: { season: number }) {
  const meta = getMeta();
  const games = getGames();
  const ps = getPlayerSeasons();
  const ts = getTeamSeasons();
  const players = playerMap();
  const teamsFull = getTeams();
  const teams: Record<string, TeamLite> = Object.fromEntries(
    teamsFull.map((t) => [t.id, toTeamLite(t, teamNameIn(t, season))]),
  );
  const gameMap = new Map(games.map((g) => [g.id, g]));
  const pg = getPlayerGames(season);

  const names = Object.fromEntries([...players.values()].map((p) => [p.id, p.name]));
  const final = seasonFinal(games, season);
  const facts = seasonFacts(games, ps, ts, season);

  const data: DashboardData = {
    season,
    hasPlayoffs: facts.playoff > 0,
    categories: DASHBOARD_CATEGORIES,
    unavailable: DASHBOARD_CATEGORIES.filter((c) => !isAvailable(c.key, season)).map((c) => c.key),
    leaders: Object.fromEntries(
      SCOPES.map((s) => [s, Object.fromEntries(DASHBOARD_CATEGORIES.map((c) => [c.key, leaders(ps, players, season, s, c.key)]))]),
    ) as DashboardData["leaders"],
    teamRows: Object.fromEntries(SCOPES.map((s) => [s, teamTable(ts, season, s)])) as DashboardData["teamRows"],
    performances: Object.fromEntries(SCOPES.map((s) => [s, topPerformances(pg, gameMap, players, s)])) as DashboardData["performances"],
    teams,
  };

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-8">
      <section className="-mx-4 border-b border-line px-4 pb-11 pt-9 sm:-mx-8 sm:px-8 sm:pt-11" aria-labelledby="season-h">
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,480px)] lg:items-end">
          <div>
            <nav className="mb-6 flex flex-wrap gap-1">
              {meta.seasons.map((y) => (
                <Link
                  key={y}
                  href={y === meta.currentSeason ? "/" : `/saison/${y}/`}
                  aria-current={y === season ? "page" : undefined}
                  className={`num px-3 py-1.5 text-[14px] font-medium ${
                    y === season ? "bg-accent font-semibold text-accent-ink" : "text-ink-2 hover:bg-surface hover:text-ink"
                  }`}
                >
                  {y}
                </Link>
              ))}
            </nav>
            <p className="mb-1.5 text-[14px] font-semibold text-accent-text">German Football League</p>
            <h1 id="season-h" className="display text-[56px] font-extrabold leading-[0.95] tracking-[-0.035em] text-ink sm:text-[80px]">
              GFL <span className="text-accent-text">{season}</span>
            </h1>
            <dl className="mt-7 grid max-w-[580px] grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              <Fact label={<T k="home.factGames" />} value={<Num v={facts.games} />} hint="home.factGamesHint" hintArgs={[facts.regular, facts.playoff]} />
              <Fact label={<T k="home.factTeams" />} value={<Num v={facts.teams} />} />
              <Fact label={<T k="home.factPlayers" />} value={<Num v={facts.players} />} hint="home.factPlayersHint" />
              <Fact label={<T k="home.factPpg" />} value={<Num v={facts.pointsPerGame} digits={1} />} hint="home.factPpgHint" />
            </dl>
          </div>
          {final ? <Scorebug final={final} teams={teams} /> : <p className="text-ink-2"><T k="home.noPlayoffs" a={[season]} /></p>}
        </div>
      </section>

      <div className="pt-0">
        <DashboardBody data={data} />
      </div>

      <SeasonVideos games={seasonHighlights(games, season)} teams={teams} season={season} />

      <div className="mt-14 flex flex-col gap-14">
        <RoleIndexSection rows={roleIndexRows(allEntries(), season, meta.availability)} names={names} teams={teams} season={season} />
        {meta.seasons.includes(season - 1) && <BreakoutSection items={breakouts(allEntries(), season, meta.availability)} names={names} teams={teams} season={season} />}
      </div>

      <aside className="mt-16 rounded-xl border border-line bg-surface px-5 py-4 text-[13.5px] text-ink-2">
        <p>
          <SourceLine builtAt={meta.builtAt} excluded={meta.corrections.filter((c) => c.type === "Spiel ausgeschlossen").length} merged={meta.corrections.filter((c) => c.type === "Spieler zusammengefuehrt").length} />{" "}
          <Link href="/methodik/" className="text-accent-text underline-offset-4 hover:underline">
            <T k="home.allCorrections" />
          </Link>
        </p>
      </aside>
    </main>
  );
}

/** Ausgewaehlte Spiele der Saison mit Highlight-Video; fuehrt zur Spielseite (dort laeuft das Video). */
function SeasonVideos({ games, teams, season }: { games: Game[]; teams: Record<string, TeamLite>; season: number }) {
  if (!games.length) return null;
  return (
    <section className="mt-14" aria-labelledby="sv-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="sv-h" className="display text-[34px] font-bold leading-none tracking-[-0.03em] text-ink"><T k="home.highlightsTitle" a={[season]} /></h2>
          <p className="mt-2 text-[13.5px] text-ink-2"><T k="home.highlightsNote" /></p>
        </div>
        <Link href={`/spiele/?saison=${season}&highlights=1`} className="text-[14px] font-semibold text-accent-text hover:underline hover:underline-offset-4">
          <T k="home.allHighlights" /> <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {games.map((g) => (
          <li key={g.id}>
            <Link href={`/spiele/${g.id}/`} className="group block overflow-hidden rounded-xl border border-line bg-surface hover:border-line-strong">
              <span className="relative block aspect-[16/7]">
                <GamePoster away={teams[g.away]} home={teams[g.home]} size={56} />
                <span className="absolute bottom-2.5 right-3 text-white/85"><VideoMark label="Highlights" /></span>
              </span>
              <span className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 truncate text-[14px] text-ink">
                  {teams[g.away]?.short} @ {teams[g.home]?.short}
                </span>
                <span className="num display shrink-0 text-[18px] font-semibold text-ink">
                  {g.awayScore}:{g.homeScore}
                </span>
              </span>
              <span className="block px-4 pb-3 text-[12.5px] text-ink-3">
                {playoffRound(g) ? <PlayoffRound name={playoffRound(g)!} /> : <T k={g.type === "playoff" ? "common.playoffs" : "common.regularSeason"} />}, <DateText iso={g.date} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({ label, value, hint, hintArgs }: { label: React.ReactNode; value: React.ReactNode; hint?: "home.factGamesHint" | "home.factPlayersHint" | "home.factPpgHint"; hintArgs?: unknown[] }) {
  return (
    <Titled as="div" k={hint} a={hintArgs}>
      <dt className="text-[12.5px] text-ink-3">{label}</dt>
      <dd className="num display mt-0.5 text-[32px] font-bold leading-tight text-ink">{value}</dd>
    </Titled>
  );
}

/** Anzeigetafel des Finales wie ein TV-Scorebug. */
function Scorebug({ final, teams }: { final: NonNullable<ReturnType<typeof seasonFinal>>; teams: Record<string, TeamLite> }) {
  const rows = [
    { ...final.winner, won: true },
    { ...final.loser, won: false },
  ];
  return (
    <figure className="overflow-hidden border-2 border-accent bg-bg">
      <figcaption className="flex items-center justify-between bg-accent px-[18px] py-3 text-[12.5px] uppercase tracking-[0.06em] text-accent-ink">
        <Link href={`/spiele/${final.id}/`} className="font-semibold hover:underline hover:underline-offset-4"><PlayoffRound name={final.label} /></Link>
        <span className="opacity-85"><DateText iso={final.date} /></span>
      </figcaption>
      {rows.map((r) => (
        <div key={r.team} className="flex items-center gap-3.5 border-b border-line px-[18px] py-4 last:border-0">
          <TeamLogo team={teams[r.team]} size={44} />
          <Link href={`/teams/${r.team}/`} className={`display min-w-0 flex-1 text-[21px] leading-[1.1] hover:underline hover:underline-offset-4 sm:text-[26px] ${r.won ? "font-bold text-ink" : "font-semibold text-ink-2"}`}>
            {teams[r.team]?.name ?? r.team}
          </Link>
          <span className={`num display text-[38px] leading-none sm:text-[46px] ${r.won ? "font-extrabold text-accent-text" : "font-bold text-ink-3"}`}>{r.score}</span>
        </div>
      ))}
      <p className="bg-navy px-[18px] py-2.5 text-[13px] font-semibold text-white"><T k="home.champion" a={[final.date.slice(0, 4), teams[final.winner.team]?.name ?? final.winner.team]} /></p>
    </figure>
  );
}

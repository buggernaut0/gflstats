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
import { fmt, fmtDate, fmtDec, fmtStamp } from "@/lib/format";
import type { Game, Scope } from "@/lib/types";
import DashboardBody, { type DashboardData } from "./DashboardBody";
import GamePoster from "./GamePoster";
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
    <main className="mx-auto max-w-[1240px] px-4 pb-24 sm:px-6">
      <section className="relative -mx-4 overflow-hidden border-b border-line px-4 pb-10 pt-8 sm:-mx-6 sm:px-6 sm:pt-12" aria-labelledby="season-h">
        <div className="yardlines pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden="true" />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_minmax(0,460px)] lg:items-end">
          <div>
            <nav aria-label="Saison wählen" className="mb-5 flex flex-wrap gap-1">
              {meta.seasons.map((y) => (
                <Link
                  key={y}
                  href={y === meta.currentSeason ? "/" : `/saison/${y}/`}
                  aria-current={y === season ? "page" : undefined}
                  className={`num rounded-md px-2.5 py-1 text-[14px] font-medium ${
                    y === season ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  {y}
                </Link>
              ))}
            </nav>
            <h1 id="season-h" className="display text-[56px] font-bold leading-[0.9] tracking-tight text-ink sm:text-[84px]">
              GFL {season}
            </h1>
            <dl className="mt-6 grid max-w-[560px] grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
              <Fact label="Spiele" value={fmt(facts.games)} hint={`${facts.regular} Regular Season, ${facts.playoff} Playoffs`} />
              <Fact label="Teams" value={fmt(facts.teams)} />
              <Fact label="Spieler" value={fmt(facts.players)} hint="mit mindestens einem Eintrag im Statistikbogen" />
              <Fact label="Punkte pro Spiel" value={fmtDec(facts.pointsPerGame)} hint="beide Teams zusammen" />
            </dl>
          </div>
          {final ? <Scorebug final={final} teams={teams} /> : <p className="text-ink-2">Noch keine Playoff-Ergebnisse für {season}.</p>}
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
          Datenquelle: Spielbögen von statsnscore.online, Stand {fmtStamp(meta.builtAt)}. Vor der Anzeige bereinigt:{" "}
          {meta.corrections.filter((c) => c.type === "Spiel ausgeschlossen").length} Spiele ausgeschlossen, Heim/Gast 2023 korrigiert,{" "}
          {meta.corrections.filter((c) => c.type === "Spieler zusammengefuehrt").length} Spieler mit mehreren Schreibweisen zusammengeführt.{" "}
          <Link href="/methodik/" className="text-accent-text underline-offset-4 hover:underline">
            Alle Korrekturen und Rechenwege
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
          <h2 id="sv-h" className="display text-[28px] font-bold leading-none tracking-tight text-ink">Highlights {season}</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">Playoff-Spiele und die knappsten Partien der Regular Season mit Highlight-Video.</p>
        </div>
        <Link href={`/spiele/?saison=${season}&highlights=1`} className="rounded-md border border-line px-3 py-1.5 text-[13.5px] font-medium text-ink-2 hover:border-line-strong hover:text-ink">
          Alle Spiele mit Highlights
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
                {playoffRound(g) ?? (g.type === "playoff" ? "Playoffs" : "Regular Season")}, {fmtDate(g.date)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint}>
      <dt className="text-[12.5px] text-ink-3">{label}</dt>
      <dd className="num display text-[26px] font-semibold leading-tight text-ink">{value}</dd>
    </div>
  );
}

/** Anzeigetafel des Finales wie ein TV-Scorebug. */
function Scorebug({ final, teams }: { final: NonNullable<ReturnType<typeof seasonFinal>>; teams: Record<string, TeamLite> }) {
  const rows = [
    { ...final.winner, won: true },
    { ...final.loser, won: false },
  ];
  return (
    <figure className="rounded-xl border border-line-strong bg-surface shadow-[0_1px_0_var(--line)]">
      <figcaption className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[13px]">
        <Link href={`/spiele/${final.id}/`} className="font-semibold text-ink hover:underline hover:underline-offset-4">{final.label}</Link>
        <span className="text-ink-3">{fmtDate(final.date)}</span>
      </figcaption>
      {rows.map((r) => (
        <div key={r.team} className="relative flex items-center justify-between gap-4 border-b border-line px-4 py-3 last:border-0">
          {r.won && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-accent" aria-hidden="true" />}
          <Link href={`/teams/${r.team}/`} className={`display truncate text-[24px] leading-tight hover:underline hover:underline-offset-4 ${r.won ? "font-semibold text-ink" : "font-medium text-ink-2"}`}>
            {teams[r.team]?.name ?? r.team}
          </Link>
          <span className={`num display text-[40px] font-bold leading-none ${r.won ? "text-ink" : "text-ink-3"}`}>{r.score}</span>
        </div>
      ))}
      <p className="px-4 py-2 text-[12.5px] text-ink-3">Deutscher Meister {final.date.slice(0, 4)}: {teams[final.winner.team]?.name ?? final.winner.team}</p>
    </figure>
  );
}

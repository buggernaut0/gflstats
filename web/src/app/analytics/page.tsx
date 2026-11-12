import Link from "next/link";
import LeaderCard from "@/components/LeaderCard";
import TeamTag from "@/components/TeamTag";
import { DASHBOARD_CATEGORIES, leaders, toTeamLite, type TeamLite } from "@/lib/dashboard";
import { gameMap, getMeta, getPlayerGames, getPlayerSeasons, getPlayers, getTeams, isAvailable, playerMap, teamNameIn } from "@/lib/data";
import { teamsAttr } from "@/lib/favorite";
import { fmtShortDate } from "@/lib/format";
import { breakouts, gameRecords } from "@/lib/insights";
import { encodeConditions, type Condition } from "@/lib/query";
import { allEntries } from "@/lib/serverCache";
import { formatStat, stat } from "@/lib/stats";

export const metadata = { title: "Analytics" };

/** Vorschau-Kategorien der Ranglisten; volle Auswahl auf /leaders/. */
const PREVIEW_CATEGORIES = ["passingyards", "runyards", "tackletotal"];
const PREVIEW_RECORDS = ["passingyards", "runyards", "receivingyards", "tackletotal"];

function searchLink(path: string, conds: Condition[], extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ ...extra, c: encodeConditions(conds) });
  return `${path}?${q.toString()}`;
}

const SEARCHES = [
  {
    href: "/spieler/?erweitert=1",
    title: "Spielersuche",
    text: "Teil der Spielerseite: Saison- oder Karrierewerte mit beliebig kombinierten Bedingungen, Filter nach Team, Rolle und Spielen.",
    examples: [
      { label: "Receiver mit ≥ 500 Yards und ≥ 5 TD", href: searchLink("/spieler/", [{ stat: "receivingyards", op: "gte", a: 500 }, { stat: "touchdowncatch", op: "gte", a: 5 }], { rolle: "WR/TE" }) },
      { label: "QBs mit ≥ 30 Passing-TD", href: searchLink("/spieler/", [{ stat: "touchdownpass", op: "gte", a: 30 }], { rolle: "QB" }) },
    ],
  },
  {
    href: "/analytics/spiele/",
    title: "Advanced Game Search",
    text: "Einzelleistungen in einzelnen Spielen, etwa alle Spiele mit 200 Receiving Yards und einem Touchdown.",
    examples: [
      { label: "RB mit ≥ 150 Rushing Yards", href: searchLink("/analytics/spiele/", [{ stat: "runyards", op: "gte", a: 150 }], { rolle: "RB" }) },
      { label: "Mehrere Sacks in einem Spiel", href: searchLink("/analytics/spiele/", [{ stat: "sacktotal", op: "gte", a: 2 }]) },
    ],
  },
  {
    href: "/analytics/teams/",
    title: "Advanced Team Search",
    text: "Team-Saisons nach Offense, Defense und Effizienz filtern und bis zu drei nebeneinander vergleichen.",
    examples: [
      { label: "Offense ≥ 40 Punkte pro Spiel", href: searchLink("/analytics/teams/", [{ stat: "ppg", op: "gte", a: 40 }]) },
      { label: "Defense ≤ 15 Gegenpunkte pro Spiel", href: searchLink("/analytics/teams/", [{ stat: "papg", op: "lte", a: 15 }]) },
    ],
  },
];

export default function AnalyticsPage() {
  const meta = getMeta();
  const season = meta.currentSeason;
  const players = playerMap();
  const games = gameMap();
  const teams: Record<string, TeamLite> = Object.fromEntries(getTeams().map((t) => [t.id, toTeamLite(t, teamNameIn(t, season))]));
  const ps = getPlayerSeasons();
  const names = Object.fromEntries(getPlayers().map((p) => [p.id, p.name]));

  const categories = DASHBOARD_CATEGORIES.filter((c) => PREVIEW_CATEGORIES.includes(c.key));
  const pgRows = meta.seasons.flatMap((s) => getPlayerGames(s));
  const records = PREVIEW_RECORDS.map((f) => ({ field: f, top: gameRecords(pgRows, games, players, f, 1)[0] })).filter((r) => r.top);
  const topBreakouts = meta.seasons.includes(season - 1) ? breakouts(allEntries(), season, meta.availability).slice(0, 3) : [];

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink">Analytics</h1>
      <p className="mt-3 max-w-[70ch] text-[14px] text-ink-2">
        Ranglisten, Rekorde, eigene Abfragen und Vergleiche an einem Ort. Jede Abfrage steht in der Adresse und lässt sich als Link speichern oder teilen.
      </p>

      <section className="mt-12" aria-labelledby="h-rank">
        <HubHead id="h-rank" title={`League Leaders ${season}`} text="Top 3 aus Regular Season und Playoffs. Die volle Rangliste deckt jede Kennzahl ab, auch Einzelsaisons und Karrieren." href="/leaders/" cta="Alle Ranglisten" />
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((c) => (
            <LeaderCard key={c.key} category={c} rows={leaders(ps, players, season, "all", c.key, 3).slice(0, 3)} teams={teams} unavailable={!isAvailable(c.key, season)} />
          ))}
        </div>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="h-rec">
          <HubHead id="h-rec" title="Rekorde" text={`Beste Einzelspiele seit ${meta.seasons[0]}; dazu Saison- und Karrierebestwerte.`} href="/rekorde/" cta="Alle Rekorde" />
          <ul className="rounded-xl border border-line bg-surface py-1.5">
            {records.map(({ field, top }) => (
              <li key={field} {...teamsAttr(top.team)} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 px-4 py-2">
                <span className="min-w-0">
                  <span className="block text-[12.5px] text-ink-3">{stat(field).label} in einem Spiel</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={`/spieler/${top.player}/`} className="truncate text-[14.5px] text-ink hover:underline hover:underline-offset-4">{names[top.player] ?? top.player}</Link>
                    <TeamTag team={teams[top.team]} />
                    <Link href={`/spiele/${top.game}/`} className="text-[12.5px] text-ink-3 hover:text-ink hover:underline">
                      {fmtShortDate(top.date)}{top.season} gegen {teams[top.opponent]?.abbr ?? top.opponent}
                    </Link>
                  </span>
                </span>
                <span className="num display text-[20px] font-semibold text-ink">{formatStat(stat(field), top.value)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="h-bo">
          <HubHead id="h-bo" title={`Breakouts ${season}`} text="Größter Sprung im Rollen-Index gegenüber der Vorsaison, dazu die stärksten Profile je Rolle." href="/analytics/breakouts/" cta="Alle Breakouts" />
          {topBreakouts.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface px-4 py-5 text-[13.5px] text-ink-3">Für {season} erfüllt kein Spieler die Kriterien.</p>
          ) : (
            <ul className="rounded-xl border border-line bg-surface py-1.5">
              {topBreakouts.map((b) => (
                <li key={b.player} {...teamsAttr(b.teams)} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 px-4 py-2">
                  <span className="min-w-0">
                    <span className="block text-[12.5px] text-ink-3">
                      {b.role}, {b.keyStat.label} {b.keyStat.before} → {b.keyStat.after}
                    </span>
                    <span className="flex items-center gap-2">
                      <Link href={`/spieler/${b.player}/`} className="truncate text-[14.5px] text-ink hover:underline hover:underline-offset-4">{names[b.player] ?? b.player}</Link>
                      {b.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}
                    </span>
                  </span>
                  <span className="num text-[14px] text-ink-2">
                    {Math.round(b.before)} → <span className="display text-[20px] font-semibold text-ink">{Math.round(b.after)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-12" aria-labelledby="h-search">
        <HubHead id="h-search" title="Eigene Abfragen" text="Bedingungen frei kombinieren. Die Beispiele öffnen das Werkzeug mit fertig gesetzten Filtern." />
        <div className="grid gap-4 md:grid-cols-3">
          {SEARCHES.map((s) => (
            <div key={s.href} className="flex flex-col rounded-xl border border-line bg-surface px-5 py-4">
              <Link href={s.href} className="display text-[20px] font-semibold text-ink hover:underline hover:underline-offset-4">{s.title}</Link>
              <p className="mt-1.5 text-[13.5px] text-ink-2">{s.text}</p>
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
                {s.examples.map((e) => (
                  <li key={e.href}>
                    <Link href={e.href} className="text-[13.5px] text-accent-text underline-offset-4 hover:underline">{e.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="h-cmp">
        <HubHead id="h-cmp" title="Vergleichen" text="Spieler und Teams nebeneinander, mit offen gelegter Normalisierung." />
        <div className="grid gap-4 md:grid-cols-2">
          <ToolCard href="/vergleich/" title="Spielervergleich" text="Bis zu drei Spieler-Saisons im Radar-Chart, als Perzentil in der Rolle oder als Anteil am Bestwert." />
          <ToolCard href="/analytics/teams/" title="Teamvergleich" text="In der Advanced Team Search bis zu drei Team-Saisons markieren und Offense, Defense und Effizienz direkt gegenüberstellen." />
        </div>
        <p className="mt-6 text-[13.5px] text-ink-2">
          Formeln, Modelle, Korrekturen und Datenlücken stehen in der{" "}
          <Link href="/methodik/" className="text-accent-text underline-offset-4 hover:underline">Methodik</Link>.
        </p>
      </section>
    </main>
  );
}

function HubHead({ id, title, text, href, cta }: { id: string; title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-[70ch]">
        <h2 id={id} className="display text-[28px] font-bold leading-none tracking-tight text-ink">{title}</h2>
        <p className="mt-2 text-[13.5px] text-ink-2">{text}</p>
      </div>
      {href && cta && (
        <Link href={href} className="shrink-0 rounded-md border border-line px-3 py-1.5 text-[13.5px] font-medium text-ink-2 hover:border-line-strong hover:text-ink">
          {cta}
        </Link>
      )}
    </div>
  );
}

function ToolCard({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="flex h-full flex-col rounded-xl border border-line bg-surface px-5 py-4 hover:border-line-strong">
      <span className="display text-[20px] font-semibold text-ink">{title}</span>
      <span className="mt-1.5 text-[13.5px] text-ink-2">{text}</span>
    </Link>
  );
}

import Link from "next/link";
import type { TeamLite } from "@/lib/dashboard";
import { fmtDec } from "@/lib/format";
import type { Breakout, IndexRow } from "@/lib/insights";
import { BREAKOUT_RULES } from "@/lib/insights";
import { ROLE_LABELS, ROLE_MIN, formatStat, stat } from "@/lib/stats";
import SourceTag from "./SourceTag";
import TeamTag from "./TeamTag";
import { teamsAttr } from "@/lib/favorite";

/** Rollen-Index je Rolle: die drei (oder n) Spieler mit dem hoechsten Index, mit Begruendung. */
export function RoleIndexSection({ rows, names, teams, season, perRole = 3, roles = ["QB", "RB", "WR/TE", "DEF"] }: { rows: IndexRow[]; names: Record<string, string>; teams: Record<string, TeamLite>; season: number; perRole?: number; roles?: string[] }) {
  return (
    <section aria-labelledby={`ri-${season}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[78ch]">
          <h2 id={`ri-${season}`} className="display text-[28px] font-bold leading-none tracking-tight text-ink">Stärkste Spieler je Rolle</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">
            Rollen-Index = Durchschnitt der sechs Perzentile aus dem Spielerprofil, innerhalb der Vergleichsgruppe {season}. Eine Zusammenfassung der Statistik, keine Auszeichnung. Die
            Begründung zeigt die stärksten Werte.{" "}
            <Link href="/methodik/#modelle" className="text-accent-text underline-offset-4 hover:underline">Wie gerechnet wird</Link>
          </p>
        </div>
        <SourceTag kind="model" detail="Mittelwert der Achsen-Perzentile" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {roles.map((role) => {
          const top = rows.filter((r) => r.role === role).slice(0, perRole);
          return (
            <div key={role} className="rounded-xl border border-line bg-surface">
              <h3 className="display border-b border-line px-4 pb-2 pt-3 text-[18px] font-semibold text-ink">{ROLE_LABELS[role]}</h3>
              <ol className="py-1">
                {top.map((r, i) => {
                  const best = [...r.axes].filter((a) => a.pct !== null).sort((a, b) => b.pct! - a.pct!).slice(0, 2);
                  return (
                    <li key={r.player} {...teamsAttr(r.teams)} className="px-4 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className={`num display text-[15px] font-semibold ${i === 0 ? "text-accent-text" : "text-ink-3"}`}>{i + 1}</span>
                          <Link href={`/spieler/${r.player}/`} className="truncate text-[14.5px] text-ink hover:underline hover:underline-offset-4">{names[r.player]}</Link>
                          {r.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}
                        </span>
                        <span className="num display text-[18px] font-semibold text-ink" title="Rollen-Index (0–100)">{Math.round(r.index)}</span>
                      </div>
                      <p className="mt-0.5 pl-6 text-[12.5px] text-ink-3">
                        {best.map((a) => `${a.label} ${formatStat(stat(a.key), a.value)} (P${Math.round(a.pct!)})`).join(", ")}
                      </p>
                    </li>
                  );
                })}
                {top.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-3">Keine Spieler mit {ROLE_MIN[role].label}.</li>}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function BreakoutSection({ items, names, teams, season, limit = 6 }: { items: Breakout[]; names: Record<string, string>; teams: Record<string, TeamLite>; season: number; limit?: number }) {
  return (
    <section aria-labelledby={`bo-${season}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[78ch]">
          <h2 id={`bo-${season}`} className="display text-[28px] font-bold leading-none tracking-tight text-ink">Breakouts {season}</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">
            Rollen-Index mindestens {BREAKOUT_RULES.minDelta} Punkte höher als {season - 1} und mindestens {BREAKOUT_RULES.minIndex}. Gleiche Rolle in beiden Jahren, je mindestens 4 Spiele;
            verglichen werden nur Kennzahlen, die in beiden Jahren erfasst sind, alle pro Spiel oder als Quote.
          </p>
        </div>
        <SourceTag kind="model" />
      </div>
      {items.length === 0 ? (
        <p className="text-[14px] text-ink-3">Kein Spieler erfüllt die Kriterien.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, limit).map((b) => (
            <div key={b.player} {...teamsAttr(b.teams)} className="rounded-xl border border-line bg-surface px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-baseline gap-2">
                  <Link href={`/spieler/${b.player}/`} className="truncate text-[15px] font-medium text-ink hover:underline hover:underline-offset-4">{names[b.player]}</Link>
                  {b.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}
                </span>
                <span className="text-[12.5px] text-ink-3">{b.role}</span>
              </div>
              <p className="num mt-1.5 text-[14px] text-ink-2">
                Rollen-Index <span className="text-ink-3">{Math.round(b.before)}</span> <span aria-hidden="true">→</span><span className="sr-only">auf</span> <span className="font-semibold text-ink">{Math.round(b.after)}</span>
                <span className="ml-1.5 text-win">+{Math.round(b.after - b.before)}</span>
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">
                {b.keyStat.label}: {b.keyStat.before} → {b.keyStat.after}. {b.prevGames} bzw. {b.games} Spiele
                {b.prevTeams.join() !== b.teams.join() && <>, Teamwechsel</>}.
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export const fmtIndex = (x: number) => fmtDec(x, 0);

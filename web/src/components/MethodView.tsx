"use client";

import Link from "next/link";
import { BREAKOUT_RULES } from "@/lib/insights";
import { MIN_GAMES, ROLE_AXES, ROLE_MIN, STATS, stat } from "@/lib/stats";
import { TEAM_METRICS } from "@/lib/team";
import { useI18n } from "@/i18n/react";

const GROUPS = ["passing", "rushing", "receiving", "defense", "kicking", "returns", "scoring"];

interface Correction { id: string; detail: string; reason: string }

/**
 * Methodik-Seite in der gewählten Sprache. Begründungen der einzelnen Korrekturen stammen aus curation/
 * (Daten, auf Deutsch gepflegt) und werden unverändert gezeigt.
 */
export default function MethodView(p: {
  builtAt: string;
  counts: { games: number; playerGameRows: number; players: number; teams: number };
  checks: { total: number; failed: number };
  sha: string;
  merged: { id: string; name: string; variants: string[]; reason: string }[];
  cleaned: number;
  /** Anzeigename nach offiziellem Kader (curation/rosters.json, nameFix) */
  renamed: Correction[];
  excluded: Correction[];
  swapped: Correction[];
  availabilityRule: string;
  seasons: number[];
  availability: Record<string, number[]>;
  fields: { key: string; group: string; description: string | null }[];
}) {
  const f = useI18n();
  const t = f.m.method;
  const quote = (s: string) => (f.lang === "de" ? `„${s}“` : `“${s}”`);
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
      <h1 className="display text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[64px]">{t.title}</h1>
      <p className="mt-4 max-w-[68ch] text-[15px] text-ink-2">
        {t.intro1} <code className="rounded bg-surface-2 px-1 text-[13px]">curation/</code>{t.intro2.startsWith(".") ? "" : " "}{t.intro2}
        {t.curationNote && <> {t.curationNote}</>}
      </p>

      <Section id="quelle" title={t.sourceTitle}>
        <dl className="grid max-w-[860px] gap-x-8 gap-y-3 text-[14px] sm:grid-cols-[220px_1fr]">
          <dt className="text-ink-3">{t.stand}</dt>
          <dd className="text-ink">{f.fmtStamp(p.builtAt)}</dd>
          <dt className="text-ink-3">{t.scope}</dt>
          <dd className="text-ink">{t.scopeText(f.fmt(p.counts.games), f.fmt(p.counts.playerGameRows), f.fmt(p.counts.players), f.fmt(p.counts.teams))}</dd>
          <dt className="text-ink-3">{t.check}</dt>
          <dd className="text-ink">{t.checkText(p.checks.total - p.checks.failed, p.checks.total)}</dd>
          <dt className="text-ink-3">{t.checksum}</dt>
          <dd className="break-all font-mono text-[12px] text-ink-2">{p.sha}</dd>
        </dl>
      </Section>

      <Section id="spiele" title={t.gamesTitle}>
        <ul className="max-w-[860px] space-y-4 text-[14px]">
          {p.excluded.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="font-medium text-ink">{t.excluded(c.detail)}</p>
              <p className="mt-1 text-ink-2" lang="de">{c.reason}</p>
            </li>
          ))}
          {p.swapped.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="font-medium text-ink">{t.swapped(c.id, c.detail)}</p>
              <p className="mt-1 text-ink-2" lang="de">{c.reason}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="spieler" title={t.playersTitle}>
        <p className="max-w-[68ch] text-[14px] text-ink-2">{t.playersText(f.fmt(p.merged.length), f.fmt(p.cleaned))}</p>
        <details className="mt-4 max-w-[980px] rounded-lg border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-[14px] font-medium text-ink">{t.showMerges(f.fmt(p.merged.length))}</summary>
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[12px] text-ink-3">
                  <th scope="col" className="py-2 pl-4 font-medium">{t.colPlayer}</th>
                  <th scope="col" className="py-2 font-medium">{t.colVariants}</th>
                  <th scope="col" className="py-2 pr-4 font-medium">{t.colReason}</th>
                </tr>
              </thead>
              <tbody>
                {p.merged.map((c) => (
                  <tr key={c.id} className="border-b border-line align-top last:border-0">
                    <td className="py-2 pl-4 pr-3">
                      <Link href={`/spieler/${c.id}/`} className="text-ink hover:underline hover:underline-offset-4">{c.name}</Link>
                    </td>
                    <td className="py-2 pr-3 text-ink-2">{c.variants.map(quote).join(", ")}</td>
                    <td className="py-2 pr-4 text-ink-3" lang="de">{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        {p.renamed.length > 0 && (
          <details className="mt-3 max-w-[980px] rounded-lg border border-line bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-[14px] font-medium text-ink">{t.showRenamed(f.fmt(p.renamed.length))}</summary>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[720px] border-collapse text-[13px]">
                <tbody>
                  {p.renamed.map((c) => (
                    <tr key={c.id} className="border-b border-line align-top last:border-0">
                      <td className="py-2 pl-4 pr-3">
                        <Link href={`/spieler/${c.id}/`} className="text-ink hover:underline hover:underline-offset-4">{c.detail}</Link>
                      </td>
                      <td className="py-2 pr-4 text-ink-3" lang="de">{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </Section>

      <Section id="felder" title={t.fieldsTitle}>
        <p className="max-w-[68ch] text-[14px] text-ink-2">
          {t.fieldsText} {f.lang === "de" && p.availabilityRule}
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-ink-3">
                <th scope="col" className="py-2 pl-4 text-left font-medium">{t.colValue}</th>
                <th scope="col" className="py-2 text-left font-medium">{t.colAbbr}</th>
                {p.seasons.map((s) => (
                  <th key={s} scope="col" className="num px-3 py-2 text-center font-medium">{s}</th>
                ))}
              </tr>
            </thead>
            {GROUPS.map((g) => (
              <tbody key={g}>
                <tr className="border-b border-line bg-surface-2/60">
                  <th scope="rowgroup" colSpan={2 + p.seasons.length} className="py-1.5 pl-4 text-left text-[12px] font-semibold text-ink-2">
                    {f.m.stats.groups[g]}
                  </th>
                </tr>
                {p.fields.filter((x) => x.group === g).map((x) => (
                  <tr key={x.key} className="border-b border-line last:border-0">
                    <td className="py-1.5 pl-4 text-ink" title={f.lang === "de" ? x.description ?? undefined : undefined}>{f.statLabel(x.key)}</td>
                    <td className="py-1.5 text-ink-3">{f.statAbbr(x.key)}</td>
                    {p.seasons.map((s) => {
                      const ok = p.availability[x.key]?.includes(s);
                      return (
                        <td key={s} className={`px-3 py-1.5 text-center ${ok ? "text-ink" : "text-ink-3"}`}>
                          {ok ? t.recorded : "–"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Section>

      <Section id="rechenwege" title={t.formulasTitle}>
        <dl className="grid max-w-[860px] gap-x-8 gap-y-3 text-[14px] sm:grid-cols-[240px_1fr]">
          {t.formulas.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink">{k}</dt>
              <dd className="text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="kennzahlen" title={t.derivedTitle}>
        <p className="max-w-[68ch] text-[14px] text-ink-2">{t.derivedText}</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-ink-3">
                <th scope="col" className="py-2 pl-4 font-medium">{t.colStat}</th>
                <th scope="col" className="py-2 font-medium">{t.colAbbr}</th>
                <th scope="col" className="py-2 font-medium">{t.colFormula}</th>
                <th scope="col" className="py-2 pr-4 font-medium">{t.colMin}</th>
              </tr>
            </thead>
            <tbody>
              {STATS.filter((d) => d.kind === "derived").map((d) => (
                <tr key={d.key} className="border-b border-line last:border-0">
                  <td className="py-1.5 pl-4 text-ink">{f.statLabel(d)}{d.lowerIsBetter && <span className="ml-1 text-[12px] text-ink-3">{f.m.player.lowerBetter}</span>}</td>
                  <td className="py-1.5 text-ink-3">{f.statAbbr(d)}</td>
                  <td className="py-1.5 text-ink-2">{f.m.stats.formula(d)}</td>
                  <td className="py-1.5 pr-4 text-ink-3">{d.qualifier ? f.m.stats.qualifier(d.qualifier) : "–"}</td>
                </tr>
              ))}
              {TEAM_METRICS.map((d) => (
                <tr key={`t-${d.key}`} className="border-b border-line last:border-0">
                  <td className="py-1.5 pl-4 text-ink">{t.teamPrefix}{f.m.team.metric.label(d)}</td>
                  <td className="py-1.5 text-ink-3">{f.m.team.metric.abbr(d)}</td>
                  <td className="py-1.5 text-ink-2">{f.m.team.metric.formula(d)}</td>
                  <td className="py-1.5 pr-4 text-ink-3">–</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="modelle" title={t.modelsTitle}>
        <div className="max-w-[72ch] space-y-3 text-[14px] text-ink-2">
          <p>
            <span className="font-medium text-ink">{t.groupLabel}</span>
            {t.groupText(MIN_GAMES, Object.entries(ROLE_MIN).map(([r, m]) => `${r}: ${f.m.stats.qualifier(m)}`).join("; "))}
          </p>
          <p>
            <span className="font-medium text-ink">{t.pctLabel}</span>
            {t.pctText}
          </p>
          <p>
            <span className="font-medium text-ink">{t.axesLabel}</span>{" "}
            {Object.entries(ROLE_AXES).map(([r, axes]) => `${f.m.stats.roles[r] ?? r}: ${axes.map((k) => f.statAbbr(stat(k))).join(", ")}`).join(". ")}.
          </p>
          <p>
            <span className="font-medium text-ink">{t.radar3dLabel}</span>
            {t.radar3dText}
          </p>
          <p>
            <span className="font-medium text-ink">{t.maxLabel}</span>
            {t.maxText}
          </p>
          <p>
            <span className="font-medium text-ink">{t.indexLabel}</span>
            {t.indexText}
          </p>
          <p>
            <span className="font-medium text-ink">{t.breakoutLabel}</span>
            {t.breakoutText(BREAKOUT_RULES.minDelta, BREAKOUT_RULES.minIndex, MIN_GAMES, BREAKOUT_RULES.minAxes)}
          </p>
        </div>
      </Section>

      <Section id="rollen" title={t.rolesTitle}>
        <p className="max-w-[68ch] text-[14px] text-ink-2">
          {t.rolesText1} <code className="rounded bg-surface-2 px-1 text-[13px]">curation/role_overrides.csv</code>{t.rolesText2.startsWith(".") ? "" : " "}{t.rolesText2}
        </p>
        <dl className="mt-4 grid max-w-[860px] gap-x-8 gap-y-2 text-[14px] sm:grid-cols-[120px_1fr]">
          {t.roleRules.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-medium text-ink">{k}</dt>
              <dd className="text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-14 scroll-mt-24">
      <h2 id={`${id}-h`} className="display mb-4 text-[34px] font-bold leading-none tracking-[-0.03em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

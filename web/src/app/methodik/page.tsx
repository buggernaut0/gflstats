import Link from "next/link";
import { FIELDS, getMeta } from "@/lib/data";
import { BREAKOUT_RULES } from "@/lib/insights";
import { MIN_GAMES, ROLE_AXES, ROLE_LABELS, ROLE_MIN, STATS } from "@/lib/stats";
import { TEAM_METRICS } from "@/lib/team";
import { fmt, fmtStamp } from "@/lib/format";

export const metadata = { title: "Methodik und Korrekturen" };

const GROUPS: Record<string, string> = {
  passing: "Passing",
  rushing: "Rushing",
  receiving: "Receiving",
  defense: "Defense",
  kicking: "Kicking",
  returns: "Returns",
  scoring: "Punkte und Strafen",
};

const FORMULAS: [string, string][] = [
  ["Siegquote", "(Siege + ½ × Unentschieden) / Spiele"],
  ["Punkte pro Spiel", "Punkte aus den Endständen / Spiele"],
  ["Team-Yards pro Spiel", "(Summe Passing Yards + Summe Rushing Yards aller Spieler des Teams) / Spiele"],
  ["Zugelassene Yards pro Spiel", "Dieselbe Summe für die jeweiligen Gegner / Spiele"],
  ["Spiele eines Spielers", "Spiele, in denen der Spieler im Statistikbogen steht. Wer ohne Statistik gespielt hat, zählt nicht."],
  ["Saisonwerte", "Summe der Spielwerte; „Längster …“-Werte als Maximum"],
];

const ROLES: [string, string][] = [
  ["QB", "mindestens 20 Passversuche und mindestens 2 pro Spiel"],
  ["K", "mindestens 5 Kicks (Field Goals, PATs, Kickoffs) und weniger als 5 offensive Aktionen"],
  ["P", "mindestens 5 Punts und weniger als 5 offensive Aktionen"],
  ["RB", "mindestens 15 Carries und 1,5-mal so viele Carries wie Receptions"],
  ["WR/TE", "mindestens 5 Receptions und mehr Receptions als Carries"],
  ["DEF", "mindestens 3 defensive Aktionen (Tackles, Sacks, INT, PD) und höchstens 2 offensive"],
];

export default function MethodikPage() {
  const meta = getMeta();
  const by = (t: string) => meta.corrections.filter((c) => c.type === t);
  const merged = by("Spieler zusammengefuehrt");
  const cleaned = by("Name bereinigt");
  const excluded = by("Spiel ausgeschlossen");
  const swapped = by("Heim/Gast getauscht");
  const groups = Object.keys(GROUPS);

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink">Methodik und Korrekturen</h1>
      <p className="mt-4 max-w-[68ch] text-[15px] text-ink-2">
        Jede Zahl dieser Seite geht auf die Spielbögen von statsnscore.online zurück. Die Originaldaten werden nie verändert: Alle Korrekturen sind hier
        einzeln aufgeführt und im Projektordner <code className="rounded bg-surface-2 px-1 text-[13px]">curation/</code> mit Begründung abgelegt.
      </p>

      <Section id="quelle" title="Datenquelle und Abgleich">
        <dl className="grid max-w-[860px] gap-x-8 gap-y-3 text-[14px] sm:grid-cols-[220px_1fr]">
          <dt className="text-ink-3">Stand der Website-Daten</dt>
          <dd className="text-ink">{fmtStamp(meta.builtAt)}</dd>
          <dt className="text-ink-3">Umfang</dt>
          <dd className="text-ink">
            {fmt(meta.counts.games)} Spiele, {fmt(meta.counts.playerGameRows)} Spieler-Spiel-Zeilen, {fmt(meta.counts.players)} Spieler, {fmt(meta.counts.teams)} Teams
          </dd>
          <dt className="text-ink-3">Abgleich mit der Datenbank</dt>
          <dd className="text-ink">
            {meta.checks.total - meta.checks.failed.length} von {meta.checks.total} Prüfungen stimmen. Geprüft wird jede Statistiksumme, die Zahl der Zeilen und
            die Zahl der Spiele – jeweils nach Abzug der ausgeschlossenen Spiele.
          </dd>
          <dt className="text-ink-3">Prüfsumme gflstats.db</dt>
          <dd className="break-all font-mono text-[12px] text-ink-2">{meta.source.databaseSha256}</dd>
        </dl>
      </Section>

      <Section id="spiele" title="Korrigierte Spiele">
        <ul className="max-w-[860px] space-y-4 text-[14px]">
          {excluded.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="font-medium text-ink">Ausgeschlossen: {c.detail}</p>
              <p className="mt-1 text-ink-2">{c.reason}</p>
            </li>
          ))}
          {swapped.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="font-medium text-ink">Heim und Gast getauscht: {c.id}, {c.detail}</p>
              <p className="mt-1 text-ink-2">{c.reason}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="spieler" title="Spieler mit mehreren Schreibweisen">
        <p className="max-w-[68ch] text-[14px] text-ink-2">
          Die Quelle kennt keine Spieler-IDs, nur Namen. {fmt(merged.length)} Spieler stehen dort unter mehreren Schreibweisen und wurden zusammengeführt,{" "}
          {fmt(cleaned.length)} weitere Namen wurden nur bereinigt (Leerzeichen, unsichtbare Zeichen). Zwei Namen werden nie zusammengeführt, wenn beide im
          selben Spiel im Statistikbogen stehen.
        </p>
        <details className="mt-4 max-w-[980px] rounded-lg border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-[14px] font-medium text-ink">Alle {fmt(merged.length)} Zusammenführungen anzeigen</summary>
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[12px] text-ink-3">
                  <th scope="col" className="py-2 pl-4 font-medium">Spieler</th>
                  <th scope="col" className="py-2 font-medium">Schreibweisen in der Quelle</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Grund</th>
                </tr>
              </thead>
              <tbody>
                {merged.map((c) => (
                  <tr key={c.id} className="border-b border-line align-top last:border-0">
                    <td className="py-2 pl-4 pr-3">
                      <Link href={`/spieler/${c.id}/`} className="text-ink hover:underline hover:underline-offset-4">{c.name}</Link>
                    </td>
                    <td className="py-2 pr-3 text-ink-2">{(c.variants ?? []).map((v) => `„${visible(v)}“`).join(", ")}</td>
                    <td className="py-2 pr-4 text-ink-3">{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>

      <Section id="felder" title="Welche Werte in welcher Saison erfasst sind">
        <p className="max-w-[68ch] text-[14px] text-ink-2">
          Ab 2025 erfasst die Quelle deutlich mehr Details. Ist ein Wert in einer Saison nicht erfasst, zeigt die Website „nicht erfasst“ statt 0 und lässt die
          Saison aus Ranglisten dieses Werts heraus. {meta.availabilityRule}
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-ink-3">
                <th scope="col" className="py-2 pl-4 text-left font-medium">Wert</th>
                <th scope="col" className="py-2 text-left font-medium">Kürzel</th>
                {meta.seasons.map((s) => (
                  <th key={s} scope="col" className="num px-3 py-2 text-center font-medium">{s}</th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g}>
                <tr className="border-b border-line bg-surface-2/60">
                  <th scope="rowgroup" colSpan={2 + meta.seasons.length} className="py-1.5 pl-4 text-left text-[12px] font-semibold text-ink-2">
                    {GROUPS[g]}
                  </th>
                </tr>
                {FIELDS.filter((f) => f.group === g).map((f) => (
                  <tr key={f.key} className="border-b border-line last:border-0">
                    <td className="py-1.5 pl-4 text-ink" title={f.description}>{f.label}</td>
                    <td className="py-1.5 text-ink-3">{f.abbr}</td>
                    {meta.seasons.map((s) => {
                      const ok = meta.availability[f.key]?.includes(s);
                      return (
                        <td key={s} className={`px-3 py-1.5 text-center ${ok ? "text-ink" : "text-ink-3"}`}>
                          {ok ? "erfasst" : "–"}
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

      <Section id="rechenwege" title="Rechenwege">
        <dl className="grid max-w-[860px] gap-x-8 gap-y-3 text-[14px] sm:grid-cols-[240px_1fr]">
          {FORMULAS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink">{k}</dt>
              <dd className="text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="kennzahlen" title="Berechnete Kennzahlen">
        <p className="max-w-[68ch] text-[14px] text-ink-2">
          Mit * markierte Kennzahlen werden aus Originalwerten berechnet, nur wenn alle Bausteine in der Saison erfasst sind. Quoten zählen in Ranglisten erst ab dem genannten
          Mindestvolumen.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-ink-3">
                <th scope="col" className="py-2 pl-4 font-medium">Kennzahl</th>
                <th scope="col" className="py-2 font-medium">Kürzel</th>
                <th scope="col" className="py-2 font-medium">Formel</th>
                <th scope="col" className="py-2 pr-4 font-medium">Mindestvolumen</th>
              </tr>
            </thead>
            <tbody>
              {STATS.filter((d) => d.kind === "derived").map((d) => (
                <tr key={d.key} className="border-b border-line last:border-0">
                  <td className="py-1.5 pl-4 text-ink">{d.label}{d.lowerIsBetter && <span className="ml-1 text-[12px] text-ink-3">(weniger ist besser)</span>}</td>
                  <td className="py-1.5 text-ink-3">{d.abbr}</td>
                  <td className="py-1.5 text-ink-2">{d.formula}</td>
                  <td className="py-1.5 pr-4 text-ink-3">{d.qualifier?.label ?? "–"}</td>
                </tr>
              ))}
              {TEAM_METRICS.map((d) => (
                <tr key={`t-${d.key}`} className="border-b border-line last:border-0">
                  <td className="py-1.5 pl-4 text-ink">Team: {d.label}</td>
                  <td className="py-1.5 text-ink-3">{d.abbr}</td>
                  <td className="py-1.5 text-ink-2">{d.formula}</td>
                  <td className="py-1.5 pr-4 text-ink-3">–</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="modelle" title="Perzentile, Radar, Rollen-Index und Breakouts">
        <div className="max-w-[72ch] space-y-3 text-[14px] text-ink-2">
          <p>
            <span className="font-medium text-ink">Vergleichsgruppe:</span> alle Spieler derselben abgeleiteten Rolle in derselben Saison mit mindestens {MIN_GAMES} Spielen und dem
            Mindestvolumen der Rolle ({Object.entries(ROLE_MIN).map(([r, m]) => `${r}: ${m.label}`).join("; ")}).
          </p>
          <p>
            <span className="font-medium text-ink">Perzentil (Mittelrang):</span> (Anzahl schlechterer Werte + ½ × Anzahl gleicher Werte) / Gruppengröße × 100. Bei „weniger ist
            besser“ wird umgedreht. 90 heißt: besser als 90 % der Gruppe.
          </p>
          <p>
            <span className="font-medium text-ink">Radar-Achsen je Rolle:</span>{" "}
            {Object.entries(ROLE_AXES).map(([r, axes]) => `${ROLE_LABELS[r]}: ${axes.map((k) => STATS.find((d) => d.key === k)?.abbr).join(", ")}`).join(". ")}.
          </p>
          <p>
            <span className="font-medium text-ink">Anteil am Bestwert</span> (Alternative im Vergleich): Wert / bester Wert der Gruppe aller Saisons × 100; bei „weniger ist besser“
            bester Wert / Wert × 100.
          </p>
          <p>
            <span className="font-medium text-ink">Rollen-Index (Modell):</span> Durchschnitt der Perzentile auf den sechs Achsen der Rolle; nur für Spieler in der
            Vergleichsgruppe und mit mindestens vier berechenbaren Achsen. Er fasst Statistik zusammen und ist keine Auszeichnung; alle Achsen zählen gleich.
          </p>
          <p>
            <span className="font-medium text-ink">Breakout (Modell):</span> Rollen-Index steigt gegenüber der Vorsaison um mindestens {BREAKOUT_RULES.minDelta} Punkte auf
            mindestens {BREAKOUT_RULES.minIndex}. Gleiche Rolle in beiden Jahren, je mindestens {MIN_GAMES} Spiele, im neuen Jahr das Mindestvolumen. Verglichen werden nur Achsen,
            die in beiden Jahren erfasst sind (mindestens {BREAKOUT_RULES.minAxes}). Weil alle Achsen pro Spiel oder Quoten sind, verzerren unterschiedliche Spielzahlen nicht;
            kleine Stichproben fängt die Mindestgrenze ab.
          </p>
        </div>
      </Section>

      <Section id="rollen" title="Abgeleitete Rollen">
        <p className="max-w-[68ch] text-[14px] text-ink-2">
          Die Quelle enthält keine Positionen. Die Rolle eines Spielers wird je Saison aus seinen Statistiken abgeleitet, in dieser Reihenfolge; die erste
          passende Regel gilt. Passt keine, bleibt die Rolle offen (z. B. bei Offensive Linemen, die keine Statistik erzeugen). Einzelne Rollen lassen sich in{" "}
          <code className="rounded bg-surface-2 px-1 text-[13px]">curation/role_overrides.csv</code> von Hand festlegen.
        </p>
        <dl className="mt-4 grid max-w-[860px] gap-x-8 gap-y-2 text-[14px] sm:grid-cols-[120px_1fr]">
          {ROLES.map(([k, v]) => (
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

/** Macht unsichtbare Zeichen sichtbar, damit erkennbar ist, worin sich Schreibweisen unterscheiden. */
function visible(name: string): string {
  return name.replace(/\u00a0/g, "⍽").replace(/\u00ad/g, "‐").replace(/^ | $/g, "⍽").replace(/ {2}/g, " ⍽");
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-14 scroll-mt-24">
      <h2 id={`${id}-h`} className="display mb-4 text-[28px] font-bold leading-none tracking-tight text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

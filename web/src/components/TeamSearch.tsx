"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readQuery, useData, writeQuery } from "@/lib/clientData";
import { decodeConditions, describe, encodeConditions, matches, type Condition, type Logic } from "@/lib/query";
import { TEAM_METRICS, fmtMetric, teamRank, teamSeasonMetrics, type TeamMetricDef, type TeamSeasonMetrics } from "@/lib/team";
import type { Game, Meta, Scope, Team, TeamSeason } from "@/lib/types";
import { Loading } from "./Loading";
import QueryBuilder, { Field, selectCls } from "./QueryBuilder";
import ResultTable, { type Column } from "./ResultTable";
import ScopeToggle from "./ScopeToggle";

const TOTALS: TeamMetricDef[] = [
  { key: "wins", label: "Siege", abbr: "S", decimals: 0, formula: "Siege" },
  { key: "losses", label: "Niederlagen", abbr: "N", decimals: 0, lowerIsBetter: true, formula: "Niederlagen" },
  { key: "pointsFor", label: "Erzielte Punkte", abbr: "Pkt", decimals: 0, formula: "Summe der Punkte aus den Endständen" },
  { key: "pointsAgainst", label: "Zugelassene Punkte", abbr: "Geg", decimals: 0, lowerIsBetter: true, formula: "Summe der Punkte der Gegner" },
];
const ALL_DEFS = [...TOTALS, ...TEAM_METRICS];
const DEF = new Map(ALL_DEFS.map((d) => [d.key, d]));
const OPTIONS = ALL_DEFS.map((d) => ({ key: d.key, label: d.label, group: TOTALS.includes(d) ? "Bilanz und Punkte" : "Pro Spiel und Quoten" }));
const DEFAULT_COLS = ["ppg", "papg", "ydsPg", "allowedYdsPg", "thirdPct", "giveawaysPg"];

const PRESETS: { label: string; sort: string; conds: Condition[] }[] = [
  { label: "Meiste Passing Yards", sort: "passYdsPg", conds: [] },
  { label: "Wenigste zugelassene Punkte", sort: "papg", conds: [] },
  { label: "Meiste Touchdowns", sort: "tdPg", conds: [] },
  { label: "Offense ≥ 40 Pkt/Sp", sort: "ppg", conds: [{ stat: "ppg", op: "gte", a: 40 }] },
  { label: "Defense ≤ 15 Geg/Sp", sort: "papg", conds: [{ stat: "papg", op: "lte", a: 15 }] },
];

const get = (t: TeamSeasonMetrics, k: string): number | null => (k in t.values ? t.values[k] : ((t as unknown as Record<string, number>)[k] ?? null));

/** Advanced Team Search mit Vergleich ausgewaehlter Team-Saisons. */
export default function TeamSearch() {
  const st = useData<[Meta, TeamSeason[], Game[], Team[]]>(["meta.json", "team_seasons.json", "games.json", "teams.json"]);
  const [season, setSeason] = useState("");
  const [scope, setScope] = useState<Scope>("regular");
  const [conds, setConds] = useState<Condition[]>([]);
  const [logic, setLogic] = useState<Logic>("and");
  const [sortKey, setSortKey] = useState("ppg");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    const q = readQuery();
    if (q.get("c")) setConds(decodeConditions(q.get("c"), (s) => DEF.has(s)));
    if (q.get("l") === "or") setLogic("or");
    if (q.get("saison")) setSeason(q.get("saison")!);
    if (q.get("phase")) setScope(q.get("phase") as Scope);
    if (q.get("vergleich")) setPicked(q.get("vergleich")!.split("~"));
  }, []);
  useEffect(() => {
    writeQuery({ c: encodeConditions(conds) || undefined, l: logic === "or" ? "or" : undefined, saison: season || undefined, phase: scope === "regular" ? undefined : scope, vergleich: picked.join("~") || undefined });
  }, [conds, logic, season, scope, picked]);

  const data = useMemo(() => {
    if (st.status !== "ready") return null;
    const [meta, ts, games, teams] = st.data;
    return { meta, all: teamSeasonMetrics(ts, games), teams: Object.fromEntries(teams.map((t) => [t.id, t])) };
  }, [st]);
  if (!data) return <Loading state={st} />;
  const { meta, all, teams } = data;

  const rows = all.filter((t) => t.scope === scope && (!season || t.season === Number(season)) && matches(conds, logic, (k) => get(t, k)));
  const show = [...new Set([...conds.map((c) => c.stat), sortKey, ...DEFAULT_COLS])].slice(0, 8);
  const keyOf = (t: TeamSeasonMetrics) => `${t.team}:${t.season}`;
  type R = TeamSeasonMetrics;
  const columns: Column<R>[] = [
    {
      key: "pick", label: "Vergleich", align: "left",
      render: (t) => (
        <input type="checkbox" aria-label={`${teams[t.team]?.name} ${t.season} vergleichen`} checked={picked.includes(keyOf(t))} disabled={!picked.includes(keyOf(t)) && picked.length >= 3}
          onChange={(e) => setPicked((p) => (e.target.checked ? [...p, keyOf(t)] : p.filter((x) => x !== keyOf(t))))} className="accent-[var(--accent)]" />
      ),
    },
    { key: "team", label: "Team", align: "left", render: (t) => <Link href={`/teams/${t.team}/`} className="hover:underline hover:underline-offset-4">{teams[t.team]?.namesBySeason[String(t.season)] ?? teams[t.team]?.name}</Link>, sort: (t) => teams[t.team]?.name ?? t.team, descFirst: false },
    { key: "season", label: "Saison", align: "left", render: (t) => <span className="num">{t.season}</span>, sort: (t) => t.season },
    { key: "record", label: "Bilanz", align: "left", render: (t) => <span className="num">{t.wins}–{t.losses}{t.ties ? `–${t.ties}` : ""}</span>, sort: (t) => (t.wins + t.ties / 2) / t.games },
    ...show.map((k) => {
      const d = DEF.get(k)!;
      return { key: k, label: d.abbr, title: `${d.label}: ${d.formula}`, render: (t: R) => fmtMetric(d, get(t, k)), sort: (t: R) => get(t, k), descFirst: !d.lowerIsBetter };
    }),
  ];

  const compared = picked.map((p) => all.find((t) => keyOf(t) === p && t.scope === scope)).filter((x): x is R => !!x);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => { setConds(p.conds); setSortKey(p.sort); }} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-2 hover:border-line-strong hover:text-ink">
            {p.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label="Saison">
          <select value={season} onChange={(e) => setSeason(e.target.value)} className={selectCls}>
            <option value="">Alle Saisons</option>
            {[...meta.seasons].reverse().map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <ScopeToggle value={scope} onChange={setScope} />
      </div>
      <QueryBuilder conditions={conds} logic={logic} options={OPTIONS} defaultStat="ppg" onChange={(c, l) => { setConds(c); setLogic(l); }} />
      <p className="mb-3 mt-6 text-[14px] text-ink">
        <span className="num font-semibold">{rows.length}</span> Team-Saisons
        {conds.length > 0 && <span className="text-ink-3"> mit {conds.map((c) => describe(c, DEF.get(c.stat)!.label)).join(logic === "and" ? " und " : " oder ")}</span>}
        <span className="text-ink-3">. Bis zu drei Zeilen zum Vergleich anhaken.</span>
      </p>
      <ResultTable rows={rows} columns={columns} initialSort={{ key: sortKey, desc: !DEF.get(sortKey)?.lowerIsBetter }} rowKey={keyOf} rowTeams={(r) => r.team} caption="Ergebnisse der Teamsuche" key={sortKey + show.join()} />

      {compared.length >= 2 && (
        <section aria-labelledby="cmp-h" className="mt-10">
          <h2 id="cmp-h" className="display mb-3 text-[26px] font-bold leading-none tracking-tight text-ink">Vergleich</h2>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[640px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-ink-3">
                  <th scope="col" className="py-2 pl-4 text-left font-medium">Kennzahl</th>
                  {compared.map((t) => <th key={keyOf(t)} scope="col" className="px-3 py-2 text-right font-medium text-ink">{teams[t.team]?.short} {t.season}</th>)}
                </tr>
              </thead>
              <tbody>
                {TEAM_METRICS.map((d) => {
                  const vals = compared.map((t) => t.values[d.key]);
                  const best = d.neutral ? null : vals.filter((v): v is number => v !== null).reduce<number | null>((b, v) => (b === null || (d.lowerIsBetter ? v < b : v > b) ? v : b), null);
                  return (
                    <tr key={d.key} className="border-b border-line last:border-0">
                      <td className="py-2 pl-4 text-ink-2" title={d.formula}>{d.label}</td>
                      {compared.map((t, i) => {
                        const rk = teamRank(all, t, d.key);
                        return (
                          <td key={keyOf(t)} className={`num px-3 py-2 text-right ${vals[i] === best && best !== null ? "font-semibold text-ink" : "text-ink-2"}`}>
                            {fmtMetric(d, vals[i])}
                            {rk && <span className="ml-1.5 text-[11.5px] text-ink-3">#{rk.rank}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">Fett = bester Wert im Vergleich. # = Rang in der jeweiligen Saison.</p>
        </section>
      )}
    </div>
  );
}

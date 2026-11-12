"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readQuery, useData, writeQuery } from "@/lib/clientData";
import { ROLES, STAT_OPTIONS, careerRows, rowValue, seasonRows } from "@/lib/explore";
import { decodeConditions, describe, encodeConditions, matches, type Condition, type Logic } from "@/lib/query";
import { ROLE_HEADLINE, ROLE_LABELS, STAT, formatStat, stat } from "@/lib/stats";
import type { Meta, Player, PlayerSeason, Scope, Team } from "@/lib/types";
import { Loading } from "./Loading";
import QueryBuilder, { Field, inputCls, selectCls } from "./QueryBuilder";
import ResultTable, { type Column } from "./ResultTable";
import ScopeToggle from "./ScopeToggle";
import TeamTag from "./TeamTag";

const PRESETS: { label: string; season: string; role: string; conds: Condition[] }[] = [
  { label: "Receiver 2025: ≥ 500 Rec Yds, ≥ 5 TD, > 50 Rec", season: "2025", role: "WR/TE", conds: [{ stat: "receivingyards", op: "gte", a: 500 }, { stat: "touchdowncatch", op: "gte", a: 5 }, { stat: "catched", op: "gt", a: 50 }] },
  { label: "Running Backs: ≥ 5,0 Yards pro Carry", season: "", role: "RB", conds: [{ stat: "ypc", op: "gte", a: 5 }, { stat: "run", op: "gte", a: 60 }] },
  { label: "Quarterbacks: ≥ 30 Pass-TD, ≤ 10 INT", season: "", role: "QB", conds: [{ stat: "touchdownpass", op: "gte", a: 30 }, { stat: "interception", op: "lte", a: 10 }] },
  { label: "Pass Rusher: ≥ 8 Sacks oder ≥ 15 TFL", season: "", role: "", conds: [{ stat: "sacktotal", op: "gte", a: 8 }, { stat: "tackleforloss", op: "gte", a: 15 }] },
];

/** Advanced Player Search: Saison- oder Karrierewerte mit frei kombinierbaren Bedingungen. */
export default function PlayerSearch({ initialConditions, presets = true }: { initialConditions?: Condition[]; presets?: boolean } = {}) {
  const st = useData<[Meta, Player[], PlayerSeason[], Team[]]>(["meta.json", "players.json", "player_seasons.json", "teams.json"]);
  const [level, setLevel] = useState<"season" | "career">("season");
  const [season, setSeason] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [team, setTeam] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [minGames, setMinGames] = useState(0);
  const [perGame, setPerGame] = useState(false);
  const [conds, setConds] = useState<Condition[]>(initialConditions ?? [{ stat: "receivingyards", op: "gte", a: 500 }]);
  const [logic, setLogic] = useState<Logic>("and");

  useEffect(() => {
    const q = readQuery();
    if (q.get("c") !== null) setConds(decodeConditions(q.get("c"), (s) => STAT.has(s)));
    if (q.get("l") === "or") setLogic("or");
    if (q.get("ebene") === "karriere") setLevel("career");
    if (q.get("saison")) setSeason(q.get("saison")!);
    if (q.get("phase")) setScope(q.get("phase") as Scope);
    if (q.get("team")) setTeam(q.get("team")!);
    if (q.get("rolle")) setRole(q.get("rolle")!);
    if (q.get("min")) setMinGames(Number(q.get("min")));
    if (q.get("proSpiel") === "1") setPerGame(true);
  }, []);

  useEffect(() => {
    writeQuery({ c: encodeConditions(conds), l: logic === "or" ? "or" : undefined, ebene: level === "career" ? "karriere" : undefined, saison: season || undefined, phase: scope === "all" ? undefined : scope, team: team || undefined, rolle: role || undefined, min: minGames ? String(minGames) : undefined, proSpiel: perGame ? "1" : undefined });
  }, [conds, logic, level, season, scope, team, role, minGames, perGame]);

  const ready = st.status === "ready" ? st.data : null;
  const result = useMemo(() => {
    if (!ready) return null;
    const [meta, players, ps, teamList] = ready;
    const pm = new Map(players.map((p) => [p.id, p]));
    const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
    let rows = level === "career" ? careerRows(ps, pm, scope) : seasonRows(ps, pm, scope).filter((r) => !season || r.season === Number(season));
    rows = rows.filter((r) => (!team || r.teams.includes(team)) && (!role || r.role === role) && r.games >= minGames && (!name || norm(r.name).includes(norm(name))));
    const get = (r: (typeof rows)[number]) => (k: string) => rowValue(stat(k), r, meta.availability, perGame);
    rows = rows.filter((r) => matches(conds, logic, get(r)));
    return { meta, rows, teams: Object.fromEntries(teamList.map((t) => [t.id, t])), teamList };
  }, [ready, level, season, scope, team, role, name, minGames, perGame, conds, logic]);

  if (st.status !== "ready" || !result) return <Loading state={st} />;
  const { meta, rows, teams, teamList } = result;
  type R = (typeof rows)[number];

  const base = [...conds.map((c) => c.stat), ...(role ? ROLE_HEADLINE[role] : [])];
  const show = [...new Set(base.length ? base : ["passingyards", "runyards", "receivingyards", "tackletotal", "sacktotal", "touchdown"])].slice(0, 8);
  const label = (k: string) => (perGame && stat(k).kind === "original" && !k.startsWith("longest") ? `${stat(k).abbr}/Sp` : stat(k).abbr);
  const columns: Column<R>[] = [
    { key: "name", label: "Spieler", align: "left", render: (r) => <Link href={`/spieler/${r.player}/`} className="hover:underline hover:underline-offset-4">{r.name}</Link>, sort: (r) => r.name, descFirst: false },
    { key: "team", label: "Team", align: "left", render: (r) => <span className="flex gap-1">{r.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}</span> },
    { key: "season", label: level === "career" ? "Saisons" : "Saison", align: "left", render: (r) => <span className="num">{level === "career" ? `${r.seasons[0]}–${r.seasons[r.seasons.length - 1]}` : r.season}</span>, sort: (r) => r.season },
    { key: "role", label: "Rolle", align: "left", render: (r) => <span className="text-ink-3">{r.role ?? "–"}</span> },
    { key: "games", label: "Sp", title: "Spiele", render: (r) => r.games, sort: (r) => r.games },
    ...show.map((k) => ({
      key: k, label: label(k), title: stat(k).formula ? `${stat(k).label}: ${stat(k).formula}` : stat(k).label,
      render: (r: R) => formatStat(perGame && stat(k).kind === "original" ? { ...stat(k), decimals: 1 } : stat(k), rowValue(stat(k), r, meta.availability, perGame)),
      sort: (r: R) => rowValue(stat(k), r, meta.availability, perGame), descFirst: !stat(k).lowerIsBetter,
    })),
  ];

  return (
    <div>
      <div className={`mb-4 flex flex-wrap gap-2 ${presets ? "" : "hidden"}`}>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => { setConds(p.conds); setLogic(p.label.includes(" oder ") ? "or" : "and"); setSeason(p.season); setRole(p.role); setLevel("season"); }} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-2 hover:border-line-strong hover:text-ink">
            {p.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label="Ebene">
          <select value={level} onChange={(e) => setLevel(e.target.value as "season" | "career")} className={selectCls}>
            <option value="season">Saisonwerte</option>
            <option value="career">Karrierewerte</option>
          </select>
        </Field>
        {level === "season" && (
          <Field label="Saison">
            <select value={season} onChange={(e) => setSeason(e.target.value)} className={selectCls}>
              <option value="">Alle Saisons</option>
              {[...meta.seasons].reverse().map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <Field label="Team">
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectCls}>
            <option value="">Alle Teams</option>
            {[...teamList].sort((a, b) => a.name.localeCompare(b.name, "de")).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Rolle (abgeleitet)">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}>
            <option value="">Alle</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
        <Field label="Spielername">
          <input type="search" value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-44`} />
        </Field>
        <Field label="Mindestspiele">
          <input type="number" min={0} value={minGames} onChange={(e) => setMinGames(Number(e.target.value))} className={`${inputCls} num w-20`} />
        </Field>
        <ScopeToggle value={scope} onChange={setScope} />
      </div>
      <label className="mb-4 flex items-center gap-2 text-[13.5px] text-ink-2">
        <input type="checkbox" checked={perGame} onChange={(e) => setPerGame(e.target.checked)} className="accent-[var(--accent)]" /> Originalwerte pro Spiel statt Summe (gilt für Bedingungen und Spalten)
      </label>
      <QueryBuilder conditions={conds} logic={logic} options={STAT_OPTIONS} defaultStat="runyards" onChange={(c, l) => { setConds(c); setLogic(l); }} />
      <p className="mb-3 mt-6 text-[14px] text-ink">
        <span className="num font-semibold">{rows.length}</span> {level === "career" ? "Spieler" : "Spieler-Saisons"}
        {conds.length > 0 && <span className="text-ink-3"> mit {conds.map((c) => describe(c, stat(c.stat).label)).join(logic === "and" ? " und " : " oder ")}</span>}
      </p>
      <ResultTable rows={rows} columns={columns} initialSort={{ key: show[0] ?? "games", desc: true }} rowKey={(r) => r.key} caption="Ergebnisse der Spielersuche" key={show.join() + level + perGame} />
      <p className="mt-3 text-[12.5px] text-ink-3">* berechnete Kennzahl. Werte, die in einer Saison nicht erfasst sind, erfüllen keine Bedingung.</p>
    </div>
  );
}

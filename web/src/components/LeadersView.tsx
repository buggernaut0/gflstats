"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readQuery, useData, writeQuery } from "@/lib/clientData";
import { ROLES, STAT_OPTIONS, careerRows, rowValue, seasonRows, type PRow } from "@/lib/explore";
import { STAT, qualifies, stat } from "@/lib/stats";
import { useI18n } from "@/i18n/react";
import type { Meta, Player, PlayerSeason, Scope, Team } from "@/lib/types";
import { Field, StatSelect, inputCls, selectCls } from "./QueryBuilder";
import ResultTable, { type Column } from "./ResultTable";
import EliteBadge from "./EliteBadge";
import type { EliteEntry } from "@/trapview/spotlight/elite";
import ScopeToggle from "./ScopeToggle";
import SourceTag from "./SourceTag";
import TeamTag from "./TeamTag";
import { Loading } from "./Loading";

/** Komplette Rangliste fuer jede Kennzahl: Saison, alle Saisons oder Karriere. */
/** elite: "spieler-id:saison" → Elite-Platzierung (lib/elite.ts eliteIndex), vom Server übergeben */
export default function LeadersView({ elite }: { elite?: Record<string, EliteEntry> } = {}) {
  const st = useData<[Meta, Player[], PlayerSeason[], Team[]]>(["meta.json", "players.json", "player_seasons.json", "teams.json"]);
  const [cat, setCat] = useState("receivingyards");
  const [season, setSeason] = useState("current");
  const [scope, setScope] = useState<Scope>("all");
  const [role, setRole] = useState("");
  const [minGames, setMinGames] = useState(0);
  const [qualify, setQualify] = useState(true);
  const [perGame, setPerGame] = useState(false);
  const f = useI18n();
  const a = f.m.analytics;

  useEffect(() => {
    const q = readQuery();
    if (q.get("kategorie") && STAT.has(q.get("kategorie")!)) setCat(q.get("kategorie")!);
    if (q.get("saison")) setSeason(q.get("saison")!);
    if (q.get("phase")) setScope(q.get("phase") as Scope);
    if (q.get("rolle")) setRole(q.get("rolle")!);
    if (q.get("min")) setMinGames(Number(q.get("min")));
    if (q.get("proSpiel") === "1") setPerGame(true);
  }, []);

  useEffect(() => {
    writeQuery({ kategorie: cat, saison: season === "current" ? undefined : season, phase: scope === "all" ? undefined : scope, rolle: role || undefined, min: minGames ? String(minGames) : undefined, proSpiel: perGame ? "1" : undefined });
  }, [cat, season, scope, role, minGames, perGame]);

  const ready = st.status === "ready" ? st.data : null;
  const def = stat(cat);

  const { rows, teams, meta } = useMemo(() => {
    if (!ready) return { rows: [] as PRow[], teams: {} as Record<string, Team>, meta: null };
    const [meta, players, ps, teamList] = ready;
    const pm = new Map(players.map((p) => [p.id, p]));
    const s = season === "current" ? meta.currentSeason : season === "career" || season === "every" ? season : Number(season);
    let base = s === "career" ? careerRows(ps, pm, scope) : seasonRows(ps, pm, scope).filter((r) => s === "every" || r.season === s);
    base = base.filter((r) => (!role || r.role === role) && r.games >= minGames && (!qualify || !def.qualifier || qualifies(def, r.stats)));
    const withVal = base.map((r) => ({ ...r, v: rowValue(def, r, meta.availability, perGame) })).filter((r) => r.v !== null && r.v !== 0);
    return { rows: withVal, teams: Object.fromEntries(teamList.map((t) => [t.id, t])), meta };
  }, [ready, def, season, scope, role, minGames, qualify, perGame]);

  if (st.status !== "ready" || !meta) return <Loading state={st} />;

  const context = def.needs.filter((k) => k !== cat).slice(0, 3);
  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "name",
      label: f.m.common.player,
      align: "left",
      render: (r) => {
        const e = r.season ? elite?.[`${r.player}:${r.season}`] : undefined;
        return (
          <span className="inline-flex items-center gap-2">
            <Link href={`/spieler/${r.player}/`} className="hover:underline hover:underline-offset-4">{r.name}</Link>
            {e && <EliteBadge entry={e} size="sm" season={r.season} />}
          </span>
        );
      },
      sort: (r) => r.name,
      descFirst: false,
    },
    { key: "team", label: f.m.common.team, align: "left", render: (r) => <span className="flex gap-1">{r.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}</span> },
    ...(season === "career" ? [] : [{ key: "season", label: f.m.common.season, align: "left" as const, render: (r: (typeof rows)[number]) => <span className="num">{r.season}</span>, sort: (r: (typeof rows)[number]) => r.season }]),
    { key: "role", label: f.m.common.role, align: "left", render: (r) => <span className="text-ink-3">{r.role ?? "–"}</span> },
    { key: "games", label: f.m.player.gamesCol, title: f.m.common.games, render: (r) => r.games, sort: (r) => r.games },
    ...context.map((k) => ({ key: k, label: f.statAbbr(k), title: f.statLabel(k), render: (r: (typeof rows)[number]) => f.fmtStat(stat(k), r.stats[k] ?? 0), sort: (r: (typeof rows)[number]) => r.stats[k] ?? 0 })),
    { key: "v", label: perGame && def.kind === "original" ? `${f.statAbbr(def)}${a.perGameAbbr}` : f.statAbbr(def), title: f.m.stats.formula(def) || f.statLabel(def), render: (r) => f.fmtStat(perGame && def.kind === "original" ? { ...def, decimals: 1 } : def, r.v), sort: (r) => r.v, descFirst: !def.lowerIsBetter },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <Field label={a.category}>
          <StatSelect value={cat} onChange={setCat} options={STAT_OPTIONS} className="min-w-[280px]" />
        </Field>
        <Field label={f.m.common.season}>
          <select value={season} onChange={(e) => setSeason(e.target.value)} className={selectCls}>
            <option value="current">{f.m.common.currentSeasonOpt(meta.currentSeason)}</option>
            {[...meta.seasons].reverse().filter((s) => s !== meta.currentSeason).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="every">{a.bestSeasons(meta.seasons[0])}</option>
            <option value="career">{a.careerSince(meta.seasons[0])}</option>
          </select>
        </Field>
        <Field label={f.m.common.roleDerived}>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}>
            <option value="">{f.m.common.allRoles}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{f.m.stats.roles[r] ?? r}</option>
            ))}
          </select>
        </Field>
        <Field label={a.minGames}>
          <input type="number" min={0} value={minGames} onChange={(e) => setMinGames(Number(e.target.value))} className={`${inputCls} num w-24`} />
        </Field>
        <ScopeToggle value={scope} onChange={setScope} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px] text-ink-2">
        {def.kind === "original" && !def.key.startsWith("longest") && (
          <label className="flex items-center gap-2"><input type="checkbox" checked={perGame} onChange={(e) => setPerGame(e.target.checked)} className="accent-[var(--accent)]" /> {a.perGame}</label>
        )}
        {def.qualifier && (
          <label className="flex items-center gap-2"><input type="checkbox" checked={qualify} onChange={(e) => setQualify(e.target.checked)} className="accent-[var(--accent)]" /> {a.minVolume(f.m.stats.qualifier(def.qualifier))}</label>
        )}
        <span className="flex gap-1.5">
          <SourceTag kind={def.kind === "derived" || perGame ? "derived" : "original"} detail={f.m.stats.formula(def) || undefined} />
          <SourceTag kind="rank" />
        </span>
      </div>
      <p className="mb-3 text-[13px] text-ink-3">
        {a.playersWithValue(rows.length)} {f.m.stats.formula(def) && a.formula(f.m.stats.formula(def))}
        {meta.seasons.some((s) => !def.needs.every((k) => meta.availability[k]?.includes(s))) && a.missingSeasons}
        {def.lowerIsBetter && a.lowerBetter}
      </p>
      <ResultTable rows={rows} columns={columns} initialSort={{ key: "v", desc: !def.lowerIsBetter }} rowKey={(r) => r.key} rowTeams={(r) => r.teams} caption={a.rankingOf(f.statLabel(def))} key={cat + season + perGame} />
    </div>
  );
}

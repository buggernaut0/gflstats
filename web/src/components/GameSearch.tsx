"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readQuery, useData, writeQuery } from "@/lib/clientData";
import { GAME_STAT_OPTIONS, ROLES } from "@/lib/explore";
import { fmtShortDate } from "@/lib/format";
import { decodeConditions, encodeConditions, matches, type Condition, type Logic } from "@/lib/query";
import { ROLE_LABELS, STAT, formatStat, stat, statAvailable, value } from "@/lib/stats";
import { GAMELOG_COLS } from "@/lib/tables";
import type { Game, Meta, Player, PlayerGame, Team } from "@/lib/types";
import { Loading } from "./Loading";
import QueryBuilder, { Field, describeCondition, inputCls, selectCls } from "./QueryBuilder";
import { useI18n } from "@/i18n/react";
import ResultTable, { type Column } from "./ResultTable";
import TeamTag from "./TeamTag";
import SeasonOptions from "@/components/SeasonOptions";
import { seasonOfFilter, seasonSelectValue } from "@/lib/seasonFilter";

const PRESETS: { label: string; role?: string; logic?: Logic; conds: Condition[] }[] = [
  { label: "Reception über 50 Yards", conds: [{ stat: "longestcatch", op: "gt", a: 50 }] },
  { label: "≥ 14 Receptions", conds: [{ stat: "catched", op: "gte", a: 14 }] },
  { label: "≥ 200 Rec Yds und ein TD", conds: [{ stat: "receivingyards", op: "gte", a: 200 }, { stat: "touchdowncatch", op: "gte", a: 1 }] },
  { label: "QB mit ≥ 4 Passing-TD", role: "QB", conds: [{ stat: "touchdownpass", op: "gte", a: 4 }] },
  { label: "RB mit ≥ 150 Rushing Yards", role: "RB", conds: [{ stat: "runyards", op: "gte", a: 150 }] },
  { label: "Mehrere Sacks", conds: [{ stat: "sacktotal", op: "gte", a: 2 }] },
  { label: "WR: ≥ 10 Rec, ≥ 150 Yds, ≥ 2 TD", role: "WR/TE", conds: [{ stat: "catched", op: "gte", a: 10 }, { stat: "receivingyards", op: "gte", a: 150 }, { stat: "touchdowncatch", op: "gte", a: 2 }] },
];

interface GRow {
  key: string;
  player: string;
  name: string;
  team: string;
  opponent: string;
  home: boolean;
  game: Game;
  role: string | null;
  s: Record<string, number>;
}

/** Advanced Game Search: Einzelleistungen in einzelnen Spielen mit kombinierbaren Bedingungen. */
export default function GameSearch() {
  const base = useData<[Meta, Player[], Team[], Game[]]>(["meta.json", "players.json", "teams.json", "games.json"]);
  const seasons = base.status === "ready" ? base.data[0].seasons : [];
  const pgs = useData<PlayerGame[][]>(seasons.map((s) => `pg/${s}.json`));
  const [season, setSeason] = useState("");
  const [phase, setPhase] = useState("");
  const [team, setTeam] = useState("");
  const [opp, setOpp] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [conds, setConds] = useState<Condition[]>(PRESETS[2].conds);
  const [logic, setLogic] = useState<Logic>("and");
  const f = useI18n();
  const a = f.m.analytics;

  useEffect(() => {
    const q = readQuery();
    if (q.get("c") !== null) setConds(decodeConditions(q.get("c"), (s) => STAT.has(s) && !stat(s).perGame));
    if (q.get("l") === "or") setLogic("or");
    for (const [k, f] of [["saison", setSeason], ["phase", setPhase], ["team", setTeam], ["gegner", setOpp], ["rolle", setRole]] as const) if (q.get(k)) f(q.get(k)!);
  }, []);

  useEffect(() => {
    writeQuery({ c: encodeConditions(conds), l: logic === "or" ? "or" : undefined, saison: season || undefined, phase: phase || undefined, team: team || undefined, gegner: opp || undefined, rolle: role || undefined });
  }, [conds, logic, season, phase, team, opp, role]);

  const all = useMemo(() => {
    if (base.status !== "ready" || pgs.status !== "ready" || !seasons.length) return null;
    const [meta, players, teamList, games] = base.data;
    const pm = new Map(players.map((p) => [p.id, p]));
    const gm = new Map(games.map((g) => [g.id, g]));
    const rows: GRow[] = [];
    for (const list of pgs.data) {
      for (const r of list) {
        const g = gm.get(r.g)!;
        const p = pm.get(r.p)!;
        if (p.shared) continue;
        const home = g.home === r.t;
        rows.push({ key: `${r.g}|${r.p}`, player: r.p, name: p.name, team: r.t, opponent: home ? g.away : g.home, home, game: g, role: p.seasons.find((s) => s.season === g.season)?.role ?? null, s: r.s });
      }
    }
    return { meta, rows, teams: Object.fromEntries(teamList.map((t) => [t.id, t])), teamList };
  }, [base, pgs, seasons.length]);

  const hits = useMemo(() => {
    if (!all) return [];
    const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const only = seasonOfFilter(season, all.meta.currentSeason);
    return all.rows.filter((r) => {
      if ((only !== null && r.game.season !== only) || (phase && r.game.type !== phase) || (team && r.team !== team) || (opp && r.opponent !== opp) || (role && r.role !== role) || (name && !norm(r.name).includes(norm(name)))) return false;
      return matches(conds, logic, (k) => (statAvailable(stat(k), r.game.season, all.meta.availability) ? value(stat(k), r.s, 1) : null));
    });
  }, [all, season, phase, team, opp, role, name, conds, logic]);

  if (!all) return <Loading state={base.status !== "ready" ? base : pgs} />;
  const { teams, teamList, meta } = all;

  const players = new Map<string, { name: string; n: number }>();
  for (const h of hits) players.set(h.player, { name: h.name, n: (players.get(h.player)?.n ?? 0) + 1 });
  const top = [...players.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5);

  const show = [...new Set([...conds.map((c) => c.stat), ...(GAMELOG_COLS[role] ?? [])])].slice(0, 8);
  const columns: Column<GRow>[] = [
    { key: "name", label: f.m.common.player, align: "left", render: (r) => <Link href={`/spieler/${r.player}/`} className="hover:underline hover:underline-offset-4">{r.name}</Link>, sort: (r) => r.name, descFirst: false },
    { key: "team", label: f.m.common.team, align: "left", render: (r) => <TeamTag team={teams[r.team]} /> },
    { key: "opp", label: f.m.common.opponent, align: "left", render: (r) => <span className="flex items-center gap-1 text-ink-3">{r.home ? f.m.common.vs : f.m.common.at} <TeamTag team={teams[r.opponent]} /></span> },
    { key: "date", label: f.m.common.date, align: "left", render: (r) => <span className="num text-ink-2">{f.fmtShortDate(r.game.date)}{f.lang === "en" ? "/" : ""}{r.game.season}{r.game.type === "playoff" && <span className="ml-1 text-[11px] text-ink-3">{f.m.player.playoffShort}</span>}</span>, sort: (r) => r.game.date },
    {
      key: "result", label: a.gameCol, align: "left",
      render: (r) => {
        const ts = r.home ? r.game.homeScore : r.game.awayScore;
        const os = r.home ? r.game.awayScore : r.game.homeScore;
        return <Link href={`/spiele/${r.game.id}/`} className="num hover:underline hover:underline-offset-4"><span className={ts > os ? "text-win" : ts < os ? "text-loss" : "text-ink-2"}>{ts > os ? f.m.common.win : ts < os ? f.m.common.loss : f.m.common.tie}</span> {ts}:{os}</Link>;
      },
    },
    ...show.map((k) => ({
      key: k, label: f.statAbbr(k), title: f.m.stats.formula(stat(k)) ? `${f.statLabel(k)}: ${f.m.stats.formula(stat(k))}` : f.statLabel(k),
      render: (r: GRow) => (statAvailable(stat(k), r.game.season, meta.availability) ? f.fmtStat(stat(k), value(stat(k), r.s, 1)) : <span className="text-[12px] text-ink-3">{f.m.common.notRecorded}</span>),
      sort: (r: GRow) => (statAvailable(stat(k), r.game.season, meta.availability) ? value(stat(k), r.s, 1) : null), descFirst: !stat(k).lowerIsBetter,
    })),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => { setConds(p.conds); setLogic(p.logic ?? "and"); setRole(p.role ?? ""); }} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-2 hover:border-line-strong hover:text-ink">
            {a.gamePresets[PRESETS.indexOf(p)] ?? p.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label={f.m.common.season}>
          <select value={seasonSelectValue(season, meta.currentSeason)} onChange={(e) => setSeason(e.target.value)} className={selectCls}>
            <SeasonOptions seasons={meta.seasons} current={meta.currentSeason} />
          </select>
        </Field>
        <Field label={a.phase}>
          <select value={phase} onChange={(e) => setPhase(e.target.value)} className={selectCls}>
            <option value="">{a.allGames}</option>
            <option value="regular">{f.m.common.regularSeason}</option>
            <option value="playoff">{f.m.common.playoffs}</option>
          </select>
        </Field>
        {[[f.m.common.team, team, setTeam], [a.opponent, opp, setOpp]].map(([l, v, set]) => (
          <Field key={l as string} label={l as string}>
            <select value={v as string} onChange={(e) => (set as (x: string) => void)(e.target.value)} className={selectCls}>
              <option value="">{f.m.common.all}</option>
              {[...teamList].sort((x, y) => x.name.localeCompare(y.name, f.locale)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        ))}
        <Field label={f.m.common.roleDerived}>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}>
            <option value="">{f.m.common.allRoles}</option>
            {ROLES.map((r) => <option key={r} value={r}>{f.m.stats.roles[r] ?? r}</option>)}
          </select>
        </Field>
        <Field label={a.playerName}>
          <input type="search" value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-44`} />
        </Field>
      </div>
      <QueryBuilder conditions={conds} logic={logic} options={GAME_STAT_OPTIONS} defaultStat="receivingyards" onChange={(c, l) => { setConds(c); setLogic(l); }} />
      <div className="mb-3 mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[14px] text-ink">
          <span className="font-semibold">{a.gameHits(hits.length, players.size)}</span>
          {conds.length > 0 && <span className="text-ink-3">{a.inAGame(conds.map((c) => describeCondition(c, f.statLabel(c.stat), f)).join(` ${logic === "and" ? f.m.common.and : f.m.common.or} `))}</span>}
        </p>
        {top.length > 1 && (
          <p className="text-[13px] text-ink-3">
            {a.mostOften} {top.map(([id, p], i) => <span key={id}>{i > 0 && ", "}<Link href={`/spieler/${id}/`} className="text-ink-2 hover:underline">{p.name}</Link> ({p.n}×)</span>)}
          </p>
        )}
      </div>
      <ResultTable rows={hits} columns={columns} initialSort={{ key: show[0] ?? "date", desc: true }} rowKey={(r) => r.key} rowTeams={(r) => r.team} caption={a.gameCaption} key={show.join()} />
      <p className="mt-3 text-[12.5px] text-ink-3">{a.gameFoot}</p>
    </div>
  );
}

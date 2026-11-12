"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readQuery, useData, writeQuery } from "@/lib/clientData";
import { GAME_STAT_OPTIONS, ROLES } from "@/lib/explore";
import { fmtShortDate } from "@/lib/format";
import { decodeConditions, describe, encodeConditions, matches, type Condition, type Logic } from "@/lib/query";
import { ROLE_LABELS, STAT, formatStat, stat, statAvailable, value } from "@/lib/stats";
import { GAMELOG_COLS } from "@/lib/tables";
import type { Game, Meta, Player, PlayerGame, Team } from "@/lib/types";
import { Loading } from "./Loading";
import QueryBuilder, { Field, inputCls, selectCls } from "./QueryBuilder";
import ResultTable, { type Column } from "./ResultTable";
import TeamTag from "./TeamTag";

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
    return all.rows.filter((r) => {
      if ((season && r.game.season !== Number(season)) || (phase && r.game.type !== phase) || (team && r.team !== team) || (opp && r.opponent !== opp) || (role && r.role !== role) || (name && !norm(r.name).includes(norm(name)))) return false;
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
    { key: "name", label: "Spieler", align: "left", render: (r) => <Link href={`/spieler/${r.player}/`} className="hover:underline hover:underline-offset-4">{r.name}</Link>, sort: (r) => r.name, descFirst: false },
    { key: "team", label: "Team", align: "left", render: (r) => <TeamTag team={teams[r.team]} /> },
    { key: "opp", label: "Gegner", align: "left", render: (r) => <span className="flex items-center gap-1 text-ink-3">{r.home ? "vs" : "@"} <TeamTag team={teams[r.opponent]} /></span> },
    { key: "date", label: "Datum", align: "left", render: (r) => <span className="num text-ink-2">{fmtShortDate(r.game.date)}{r.game.season}{r.game.type === "playoff" && <span className="ml-1 text-[11px] text-ink-3">PO</span>}</span>, sort: (r) => r.game.date },
    {
      key: "result", label: "Spiel", align: "left",
      render: (r) => {
        const ts = r.home ? r.game.homeScore : r.game.awayScore;
        const os = r.home ? r.game.awayScore : r.game.homeScore;
        return <Link href={`/spiele/${r.game.id}/`} className="num hover:underline hover:underline-offset-4"><span className={ts > os ? "text-win" : ts < os ? "text-loss" : "text-ink-2"}>{ts > os ? "S" : ts < os ? "N" : "U"}</span> {ts}:{os}</Link>;
      },
    },
    ...show.map((k) => ({
      key: k, label: stat(k).abbr, title: stat(k).formula ? `${stat(k).label}: ${stat(k).formula}` : stat(k).label,
      render: (r: GRow) => (statAvailable(stat(k), r.game.season, meta.availability) ? formatStat(stat(k), value(stat(k), r.s, 1)) : <span className="text-[12px] text-ink-3">n. e.</span>),
      sort: (r: GRow) => (statAvailable(stat(k), r.game.season, meta.availability) ? value(stat(k), r.s, 1) : null), descFirst: !stat(k).lowerIsBetter,
    })),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => { setConds(p.conds); setLogic(p.logic ?? "and"); setRole(p.role ?? ""); }} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-2 hover:border-line-strong hover:text-ink">
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
        <Field label="Spielphase">
          <select value={phase} onChange={(e) => setPhase(e.target.value)} className={selectCls}>
            <option value="">Alle Spiele</option>
            <option value="regular">Regular Season</option>
            <option value="playoff">Playoffs</option>
          </select>
        </Field>
        {[["Team", team, setTeam], ["Gegner", opp, setOpp]].map(([l, v, f]) => (
          <Field key={l as string} label={l as string}>
            <select value={v as string} onChange={(e) => (f as (x: string) => void)(e.target.value)} className={selectCls}>
              <option value="">Alle</option>
              {[...teamList].sort((a, b) => a.name.localeCompare(b.name, "de")).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        ))}
        <Field label="Rolle (abgeleitet)">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}>
            <option value="">Alle</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
        <Field label="Spielername">
          <input type="search" value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-44`} />
        </Field>
      </div>
      <QueryBuilder conditions={conds} logic={logic} options={GAME_STAT_OPTIONS} defaultStat="receivingyards" onChange={(c, l) => { setConds(c); setLogic(l); }} />
      <div className="mb-3 mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[14px] text-ink">
          <span className="num font-semibold">{hits.length}</span> Spielleistungen von <span className="num font-semibold">{players.size}</span> Spielern
          {conds.length > 0 && <span className="text-ink-3"> mit {conds.map((c) => describe(c, stat(c.stat).label)).join(logic === "and" ? " und " : " oder ")} in einem Spiel</span>}
        </p>
        {top.length > 1 && (
          <p className="text-[13px] text-ink-3">
            Am häufigsten: {top.map(([id, p], i) => <span key={id}>{i > 0 && ", "}<Link href={`/spieler/${id}/`} className="text-ink-2 hover:underline">{p.name}</Link> ({p.n}×)</span>)}
          </p>
        )}
      </div>
      <ResultTable rows={hits} columns={columns} initialSort={{ key: show[0] ?? "date", desc: true }} rowKey={(r) => r.key} rowTeams={(r) => r.team} caption="Ergebnisse der Spielsuche" key={show.join()} />
      <p className="mt-3 text-[12.5px] text-ink-3">Jede Zeile ist ein Spieler in einem Spiel. „n. e.“ = in dieser Saison nicht erfasst; solche Werte erfüllen keine Bedingung.</p>
    </div>
  );
}

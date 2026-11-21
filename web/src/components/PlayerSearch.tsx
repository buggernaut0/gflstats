"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readQuery, useData, writeQuery } from "@/lib/clientData";
import { CAREER_PREFIX, PLAYER_STAT_OPTIONS, ROLES, baseKey, careerRows, isCareerKey, rowRecorded, rowValue, seasonRows, type PRow } from "@/lib/explore";
import { decodeConditions, encodeConditions, isComplete, matches, type Condition } from "@/lib/query";
import { ROLE_HEADLINE, STAT, stat } from "@/lib/stats";
import type { Meta, Player, PlayerSeason, Scope, Team } from "@/lib/types";
import { Loading } from "./Loading";
import QueryBuilder, { Field, describeCondition, selectCls } from "./QueryBuilder";
import { useI18n } from "@/i18n/react";
import ResultTable, { type Column } from "./ResultTable";
import EliteBadge from "./EliteBadge";
import PlayerPhoto from "./PlayerPhoto";
import type { EliteEntry } from "@/trapview/spotlight/elite";
import ScopeToggle from "./ScopeToggle";
import TeamTag from "./TeamTag";
import SeasonOptions from "@/components/SeasonOptions";
import { ALL_SEASONS, seasonOfFilter, seasonSelectValue } from "@/lib/seasonFilter";

/** Spalten ohne Bedingungen und ohne Rolle */
const DEFAULT_COLUMNS = ["passingyards", "runyards", "receivingyards", "tackletotal", "sacktotal", "touchdown"];

/**
 * Spielersuche: die einzige Implementierung fuer Spielerlisten mit Filtern.
 * Oben Namenssuche und Schnellfilter (Saison, Team, Rolle, Phase), darunter direkt sichtbar die
 * Statistiksuche: beliebig viele Bedingungen "Kennzahl Operator Wert", immer mit UND verknuepft.
 * Jede Kennzahl gibt es als Saisonwert und als Karrierewert ("Karriere: ...", Schluessel "k.<kennzahl>").
 * Alle Einstellungen stehen in der Adresse; Links der frueheren /analytics/spieler/ bleiben gueltig.
 */
/** elite: "spieler-id:saison" → Elite-Platzierung (lib/elite.ts eliteIndex), vom Server übergeben */
export default function PlayerSearch({ elite }: { elite?: Record<string, EliteEntry> } = {}) {
  const st = useData<[Meta, Player[], PlayerSeason[], Team[]]>(["meta.json", "players.json", "player_seasons.json", "teams.json"]);
  const [season, setSeason] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [team, setTeam] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [conds, setConds] = useState<Condition[]>([]);
  const f = useI18n();
  const { m } = f;
  const ps = m.playerSearch;

  useEffect(() => {
    const q = readQuery();
    let c = decodeConditions(q.get("c"), (s) => STAT.has(baseKey(s)));
    // Fruehere Links mit "Ebene: Karrierewerte" (?ebene=karriere): Bedingungen als Karrierewerte uebernehmen
    if (q.get("ebene") === "karriere") c = c.map((x) => (isCareerKey(x.stat) ? x : { ...x, stat: CAREER_PREFIX + x.stat }));
    if (c.length) setConds(c);
    if (q.get("saison")) setSeason(q.get("saison")!);
    if (q.get("phase")) setScope(q.get("phase") as Scope);
    if (q.get("team")) setTeam(q.get("team")!);
    if (q.get("rolle")) setRole(q.get("rolle")!);
    if (q.get("name")) setName(q.get("name")!);
  }, []);

  useEffect(() => {
    writeQuery({
      name: name.trim() || undefined, saison: season || undefined, team: team || undefined, rolle: role || undefined, phase: scope === "all" ? undefined : scope,
      c: encodeConditions(conds) || undefined,
    });
  }, [name, season, team, role, scope, conds]);

  const active = useMemo(() => conds.filter(isComplete), [conds]);
  const ready = st.status === "ready" ? st.data : null;
  // Spielerfotos aus der zentralen Zuordnung (players.json → photo)
  const photos = useMemo(() => new Map((ready?.[1] ?? []).map((p) => [p.id, p.photo])), [ready]);
  const result = useMemo(() => {
    if (!ready) return null;
    const [meta, players, ps, teamList] = ready;
    const pm = new Map(players.map((p) => [p.id, p]));
    const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase();
    const words = norm(name.trim()).split(/\s+/).filter(Boolean);
    // Karrierewerte je Spieler (alle Saisons, gewaehlte Phase), nur wenn eine Bedingung sie braucht
    const career = active.some((c) => isCareerKey(c.stat)) ? new Map(careerRows(ps, pm, scope).map((r) => [r.player, r])) : new Map<string, PRow>();
    const valueOf = (r: PRow, k: string) => {
      if (!isCareerKey(k)) return rowValue(stat(k), r, meta.availability);
      const c = career.get(r.player);
      return c ? rowValue(stat(baseKey(k)), c, meta.availability) : null;
    };
    const recordedOf = (r: PRow, k: string) => {
      const row = isCareerKey(k) ? career.get(r.player) : r;
      return !!row && rowRecorded(stat(baseKey(k)), row, meta.availability);
    };
    // Standard: aktuelle Saison – ältere Saisons und „alle“ über den Saisonfilter
    const only = seasonOfFilter(season, meta.currentSeason);
    let all = seasonRows(ps, pm, scope);
    all = all.filter((r) => (!team || r.teams.includes(team)) && (!role || r.role === role) && words.every((w) => norm(r.name).includes(w)));
    all = all.filter((r) => matches(active, "and", (k) => valueOf(r, k)));
    const rows = all.filter((r) => only === null || r.season === only);
    // Treffer nur in anderen Saisons (z. B. Namenssuche nach einem Spieler ohne Einsatz in der gewählten Saison)
    const inSeason = new Set(rows.map((r) => r.player));
    const elsewhere = only === null ? 0 : new Set(all.filter((r) => !inSeason.has(r.player)).map((r) => r.player)).size;
    return { meta, rows, only, elsewhere, teams: Object.fromEntries(teamList.map((t) => [t.id, t])), teamList, valueOf, recordedOf };
  }, [ready, season, scope, team, role, name, active]);

  if (st.status !== "ready" || !result) return <Loading state={st} />;
  const { meta, rows, only, elsewhere, teams, teamList, valueOf, recordedOf } = result;
  type R = (typeof rows)[number];

  const anyFilter = conds.length > 0 || !!(name.trim() || season || team || role || scope !== "all");
  function reset() {
    setName(""); setSeason(""); setTeam(""); setRole(""); setScope("all"); setConds([]);
  }

  const labelOf = (k: string) => (isCareerKey(k) ? m.query.careerLabel(f.statLabel(baseKey(k))) : f.statLabel(k));
  const base = [...active.map((c) => c.stat), ...(role ? ROLE_HEADLINE[role] : [])];
  const show = [...new Set(base.length ? base : DEFAULT_COLUMNS)].slice(0, 8);
  const playerCount = new Set(rows.map((r) => r.player)).size;
  const columns: Column<R>[] = [
    {
      key: "name",
      label: m.common.player,
      align: "left",
      render: (r) => {
        const e = r.season ? elite?.[`${r.player}:${r.season}`] : undefined;
        return (
          <span className="inline-flex items-center gap-2.5">
            <PlayerPhoto photo={photos.get(r.player)} name={r.name} size="xs" />
            <Link href={`/spieler/${r.player}/`} className="hover:underline hover:underline-offset-4">{r.name}</Link>
            {e && <EliteBadge entry={e} size="sm" season={r.season} />}
          </span>
        );
      },
      sort: (r) => r.name,
      descFirst: false,
    },
    { key: "team", label: m.common.team, align: "left", render: (r) => <span className="flex gap-1">{r.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}</span> },
    { key: "season", label: m.common.season, align: "left", render: (r) => <span className="num">{r.season}</span>, sort: (r) => r.season },
    { key: "role", label: m.common.role, align: "left", render: (r) => <span className="text-ink-3">{r.role ?? "–"}</span>, sort: (r) => r.role ?? "", descFirst: false },
    { key: "games", label: ps.gamesShort, title: m.common.games, render: (r) => r.games, sort: (r) => r.games },
    ...show.map((k) => {
      const def = stat(baseKey(k));
      const career = isCareerKey(k);
      return {
        key: k,
        label: career ? `${f.statAbbr(def)} ${m.query.careerShort}` : f.statAbbr(def),
        title: `${career ? m.query.careerTitle : ""}${m.stats.formula(def) ? `${f.statLabel(def)}: ${m.stats.formula(def)}` : f.statLabel(def)}`,
        render: (r: R) =>
          recordedOf(r, k) ? f.fmtStat(def, valueOf(r, k)) : <span className="text-ink-3" title={m.table.notRecordedSeason}>{m.common.notRecorded}</span>,
        sort: (r: R) => valueOf(r, k), descFirst: !def.lowerIsBetter,
      };
    }),
  ];
  return (
    <div>
      {/* Einfache Suche: Name und Schnellfilter */}
      <div className="flex flex-col gap-4">
        <label className="relative block max-w-[640px]">
          <span className="sr-only">{ps.nameLabel}</span>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={ps.namePlaceholder}
            autoComplete="off"
            className="h-12 w-full rounded-lg border border-line bg-surface pl-11 pr-4 text-[16px] text-ink placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <Field label={m.common.season}>
            <select value={seasonSelectValue(season, meta.currentSeason)} onChange={(e) => setSeason(e.target.value)} className={selectCls}>
              <SeasonOptions seasons={meta.seasons} current={meta.currentSeason} />
            </select>
          </Field>
          <Field label={m.common.team}>
            <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectCls}>
              <option value="">{m.common.allTeams}</option>
              {[...teamList].sort((a, b) => a.name.localeCompare(b.name, f.locale)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label={m.common.roleDerived}>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}>
              <option value="">{m.common.allRoles}</option>
              {ROLES.map((r) => <option key={r} value={r}>{m.stats.roles[r] ?? r}</option>)}
            </select>
          </Field>
          <ScopeToggle value={scope} onChange={setScope} />
        </div>
      </div>

      {/* Statistiksuche: direkt sichtbar, Bedingungen mit UND verknuepft */}
      <section className="mt-6 rounded-xl border border-line bg-surface px-4 pb-4 pt-3" aria-labelledby="statsuche-h">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="statsuche-h" className="display text-[19px] font-semibold text-ink">{ps.statSearch}</h2>
          {conds.length > 0 && (
            <button type="button" onClick={() => setConds([])} className="text-[13px] text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              {ps.clearConditions}
            </button>
          )}
        </div>
        <QueryBuilder conditions={conds} logic="and" options={PLAYER_STAT_OPTIONS} defaultStat="runyards" framed={false} allowOr={false} draft onChange={(c) => setConds(c)} />
      </section>

      <div className="mb-3 mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[14px] text-ink">
          <span className="font-semibold">{ps.rowsIn(rows.length, only)}</span>
          {playerCount !== rows.length && <span className="text-ink-3">{ps.playersParen(playerCount)}</span>}
          {active.length > 0 && <span className="text-ink-3">{ps.withConds(active.map((c) => describeCondition(c, labelOf(c.stat), f)).join(` ${m.common.and} `))}</span>}
        </p>
        {elsewhere > 0 && (name.trim() || active.length > 0 || team || role) && (
          <p className="w-full text-[13px] text-ink-2 sm:order-last">
            {ps.elsewhere(elsewhere, only)}{" "}
            <button type="button" onClick={() => setSeason(ALL_SEASONS)} className="text-accent-text underline-offset-4 hover:underline">
              {ps.showAllSeasons}
            </button>
          </p>
        )}
        {anyFilter && (
          <button type="button" onClick={reset} className="text-[13px] text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            {m.common.resetFilters}
          </button>
        )}
      </div>
      <ResultTable rows={rows} columns={columns} initialSort={{ key: show[0] ?? "games", desc: true }} rowKey={(r) => r.key} rowTeams={(r) => r.teams} caption={ps.caption} key={show.join()} />
      <p className="mt-3 text-[12.5px] text-ink-3">
        {ps.footnote}
      </p>
    </div>
  );
}

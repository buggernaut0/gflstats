"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readQuery, useData, writeQuery } from "@/lib/clientData";
import { PLAYER_PRESETS, ROLES, STAT_OPTIONS, careerRows, rowRecorded, rowValue, seasonRows } from "@/lib/explore";
import { decodeConditions, describe, encodeConditions, matches, type Condition, type Logic } from "@/lib/query";
import { ROLE_HEADLINE, ROLE_LABELS, STAT, formatStat, stat } from "@/lib/stats";
import type { Meta, Player, PlayerSeason, Scope, Team } from "@/lib/types";
import { Loading } from "./Loading";
import QueryBuilder, { Field, inputCls, selectCls } from "./QueryBuilder";
import ResultTable, { type Column } from "./ResultTable";
import ScopeToggle from "./ScopeToggle";
import TeamTag from "./TeamTag";

/** Spalten ohne Bedingungen und ohne Rolle */
const DEFAULT_COLUMNS = ["passingyards", "runyards", "receivingyards", "tackletotal", "sacktotal", "touchdown"];

/**
 * Spielersuche: die einzige Implementierung fuer Spielerlisten mit Filtern.
 * Oben Namenssuche und Schnellfilter, darunter die aufklappbare Statistiksuche mit
 * beliebig vielen Bedingungen (UND/ODER) ueber den kompletten Kennzahlen-Katalog.
 * Alle Einstellungen stehen in der Adresse; Links der frueheren /analytics/spieler/ bleiben gueltig.
 */
export default function PlayerSearch() {
  const st = useData<[Meta, Player[], PlayerSeason[], Team[]]>(["meta.json", "players.json", "player_seasons.json", "teams.json"]);
  const [level, setLevel] = useState<"season" | "career">("season");
  const [season, setSeason] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [team, setTeam] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [minGames, setMinGames] = useState(0);
  const [perGame, setPerGame] = useState(false);
  const [conds, setConds] = useState<Condition[]>([]);
  const [logic, setLogic] = useState<Logic>("and");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = readQuery();
    if (q.get("c") !== null) setConds(decodeConditions(q.get("c"), (s) => STAT.has(s)));
    if (q.get("l") === "or") setLogic("or");
    if (q.get("ebene") === "karriere") setLevel("career");
    if (q.get("saison")) setSeason(q.get("saison")!);
    if (q.get("phase")) setScope(q.get("phase") as Scope);
    if (q.get("team")) setTeam(q.get("team")!);
    if (q.get("rolle")) setRole(q.get("rolle")!);
    if (q.get("name")) setName(q.get("name")!);
    if (q.get("min")) setMinGames(Number(q.get("min")));
    if (q.get("proSpiel") === "1") setPerGame(true);
    // Statistiksuche geoeffnet, wenn ausdruecklich verlangt oder erweiterte Einstellungen im Link stehen
    if (q.get("erweitert") === "1" || ["c", "ebene", "min", "proSpiel"].some((k) => q.get(k))) setOpen(true);
  }, []);

  useEffect(() => {
    writeQuery({
      name: name.trim() || undefined, saison: season || undefined, team: team || undefined, rolle: role || undefined, phase: scope === "all" ? undefined : scope,
      c: encodeConditions(conds), l: logic === "or" ? "or" : undefined, ebene: level === "career" ? "karriere" : undefined,
      min: minGames ? String(minGames) : undefined, proSpiel: perGame ? "1" : undefined, erweitert: open ? "1" : undefined,
    });
  }, [name, season, team, role, scope, conds, logic, level, minGames, perGame, open]);

  const ready = st.status === "ready" ? st.data : null;
  const result = useMemo(() => {
    if (!ready) return null;
    const [meta, players, ps, teamList] = ready;
    const pm = new Map(players.map((p) => [p.id, p]));
    const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase();
    const words = norm(name.trim()).split(/\s+/).filter(Boolean);
    let rows = level === "career" ? careerRows(ps, pm, scope) : seasonRows(ps, pm, scope).filter((r) => !season || r.season === Number(season));
    rows = rows.filter((r) => (!team || r.teams.includes(team)) && (!role || r.role === role) && r.games >= minGames && words.every((w) => norm(r.name).includes(w)));
    const get = (r: (typeof rows)[number]) => (k: string) => rowValue(stat(k), r, meta.availability, perGame);
    rows = rows.filter((r) => matches(conds, logic, get(r)));
    return { meta, rows, teams: Object.fromEntries(teamList.map((t) => [t.id, t])), teamList };
  }, [ready, level, season, scope, team, role, name, minGames, perGame, conds, logic]);

  if (st.status !== "ready" || !result) return <Loading state={st} />;
  const { meta, rows, teams, teamList } = result;
  type R = (typeof rows)[number];

  const advancedCount = conds.length + (level === "career" ? 1 : 0) + (minGames > 0 ? 1 : 0) + (perGame ? 1 : 0);
  const anyFilter = advancedCount > 0 || !!(name.trim() || season || team || role || scope !== "all");
  function reset() {
    setName(""); setSeason(""); setTeam(""); setRole(""); setScope("all");
    setConds([]); setLogic("and"); setLevel("season"); setMinGames(0); setPerGame(false);
  }

  const base = [...conds.map((c) => c.stat), ...(role ? ROLE_HEADLINE[role] : [])];
  const show = [...new Set(base.length ? base : DEFAULT_COLUMNS)].slice(0, 8);
  const label = (k: string) => (perGame && stat(k).kind === "original" && !k.startsWith("longest") ? `${stat(k).abbr}/Sp` : stat(k).abbr);
  const columns: Column<R>[] = [
    { key: "name", label: "Spieler", align: "left", render: (r) => <Link href={`/spieler/${r.player}/`} className="hover:underline hover:underline-offset-4">{r.name}</Link>, sort: (r) => r.name, descFirst: false },
    { key: "team", label: "Team", align: "left", render: (r) => <span className="flex gap-1">{r.teams.map((t) => <TeamTag key={t} team={teams[t]} />)}</span> },
    { key: "season", label: level === "career" ? "Saisons" : "Saison", align: "left", render: (r) => <span className="num">{level === "career" ? `${r.seasons[0]}–${r.seasons[r.seasons.length - 1]}` : r.season}</span>, sort: (r) => r.season },
    { key: "role", label: "Rolle", align: "left", render: (r) => <span className="text-ink-3">{r.role ?? "–"}</span>, sort: (r) => r.role ?? "", descFirst: false },
    { key: "games", label: "Sp", title: "Spiele", render: (r) => r.games, sort: (r) => r.games },
    ...show.map((k) => ({
      key: k, label: label(k), title: stat(k).formula ? `${stat(k).label}: ${stat(k).formula}` : stat(k).label,
      render: (r: R) =>
        rowRecorded(stat(k), r, meta.availability) ? (
          formatStat(perGame && stat(k).kind === "original" ? { ...stat(k), decimals: 1 } : stat(k), rowValue(stat(k), r, meta.availability, perGame))
        ) : (
          <span className="text-ink-3" title="In dieser Saison nicht erfasst">n. e.</span>
        ),
      sort: (r: R) => rowValue(stat(k), r, meta.availability, perGame), descFirst: !stat(k).lowerIsBetter,
    })),
  ];

  return (
    <div>
      {/* Einfache Suche: Name und Schnellfilter */}
      <div className="flex flex-col gap-4">
        <label className="relative block max-w-[640px]">
          <span className="sr-only">Spielername</span>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Spieler suchen, z. B. Tim Müller"
            autoComplete="off"
            className="h-12 w-full rounded-lg border border-line bg-surface pl-11 pr-4 text-[16px] text-ink placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <Field label="Saison">
            <select value={level === "career" ? "" : season} onChange={(e) => setSeason(e.target.value)} disabled={level === "career"} title={level === "career" ? "Bei Karrierewerten zählen alle Saisons" : undefined} className={`${selectCls} disabled:opacity-50`}>
              <option value="">{level === "career" ? "Karriere" : "Alle Saisons"}</option>
              {[...meta.seasons].reverse().map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
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
          <ScopeToggle value={scope} onChange={setScope} />
        </div>
      </div>

      {/* Statistiksuche: gleicher Datenbestand, zusaetzliche Bedingungen */}
      <section className="mt-6 rounded-xl border border-line bg-surface" aria-labelledby="statsuche-h">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="statsuche"
          className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left"
        >
          <span>
            <span id="statsuche-h" className="display text-[19px] font-semibold text-ink">Statistiksuche</span>
            <span className="ml-3 text-[13.5px] text-ink-2">Bedingungen für jede erfasste Kennzahl, mit UND/ODER, Saison- oder Karrierewerten</span>
          </span>
          <span className="flex items-center gap-3 text-[13px] text-ink-2">
            {advancedCount > 0 && (
              <span className="text-accent-text">
                {advancedCount} {advancedCount === 1 ? "Einstellung" : "Einstellungen"} aktiv
              </span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className={open ? "rotate-180" : ""}>
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        {open && (
          <div id="statsuche" className="border-t border-line px-4 pb-5 pt-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-ink-3">Vorlagen</span>
              {PLAYER_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setConds(p.conds); setLogic(p.logic ?? "and"); setSeason(p.season); setRole(p.role); setLevel("season"); }}
                  className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-2 hover:border-line-strong hover:text-ink"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
              <Field label="Ebene">
                <select value={level} onChange={(e) => setLevel(e.target.value as "season" | "career")} className={selectCls}>
                  <option value="season">Saisonwerte</option>
                  <option value="career">Karrierewerte</option>
                </select>
              </Field>
              <Field label="Mindestspiele">
                <input type="number" min={0} value={minGames} onChange={(e) => setMinGames(Number(e.target.value))} className={`${inputCls} num w-20`} />
              </Field>
              <label className="flex h-9 items-center gap-2 text-[13.5px] text-ink-2">
                <input type="checkbox" checked={perGame} onChange={(e) => setPerGame(e.target.checked)} className="accent-[var(--accent)]" /> Originalwerte pro Spiel statt Summe
              </label>
            </div>
            <QueryBuilder conditions={conds} logic={logic} options={STAT_OPTIONS} defaultStat="runyards" framed={false} onChange={(c, l) => { setConds(c); setLogic(l); }} />
          </div>
        )}
      </section>

      <div className="mb-3 mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[14px] text-ink">
          <span className="num font-semibold">{rows.length}</span> {level === "career" ? "Spieler" : "Spieler-Saisons"}
          {conds.length > 0 && <span className="text-ink-3"> mit {conds.map((c) => describe(c, stat(c.stat).label)).join(logic === "and" ? " und " : " oder ")}</span>}
        </p>
        {anyFilter && (
          <button type="button" onClick={reset} className="text-[13px] text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            Alle Filter zurücksetzen
          </button>
        )}
      </div>
      <ResultTable rows={rows} columns={columns} initialSort={{ key: show[0] ?? "games", desc: true }} rowKey={(r) => r.key} rowTeams={(r) => r.teams} caption="Ergebnisse der Spielersuche" key={show.join() + level + perGame} />
      <p className="mt-3 text-[12.5px] text-ink-3">
        * berechnete Kennzahl. „n. e.“ = in dieser Saison nicht erfasst; solche Werte gelten nicht als 0 und erfüllen keine Bedingung.
      </p>
    </div>
  );
}

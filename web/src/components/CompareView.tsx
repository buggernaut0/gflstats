"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readQuery, useData, writeQuery } from "@/lib/clientData";
import { comparisonGroup, entries, qualified, type Entry } from "@/lib/profile";
import { ROLE_AXES, ROLE_MIN, median, percentile, stat, statAvailable, value } from "@/lib/stats";
import { useI18n } from "@/i18n/react";
import type { Meta, Player, PlayerSeason, Team } from "@/lib/types";
import { Loading } from "./Loading";
import { Field, selectCls } from "./QueryBuilder";
import Radar, { SERIES_STYLE, SeriesKey } from "./Radar";
import SourceTag from "./SourceTag";
import { teamsAttr } from "@/lib/favorite";

type Mode = "season" | "all" | "max";
interface Slot { player: string; season: number }

/** Normalisierungen; Bezeichnung und Erklärung in src/i18n (analytics.modes). */
const MODES: Mode[] = ["season", "all", "max"];

/** Spielervergleich: bis zu drei Spieler-Saisons im Radar-Chart, normalisiert und nachvollziehbar. */
export default function CompareView() {
  const st = useData<[Meta, Player[], PlayerSeason[], Team[]]>(["meta.json", "players.json", "player_seasons.json", "teams.json"]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [role, setRole] = useState("");
  const [mode, setMode] = useState<Mode>("season");
  const [hidden, setHidden] = useState<number[]>([]);
  const f = useI18n();
  const a = f.m.analytics;

  const data = useMemo(() => {
    if (st.status !== "ready") return null;
    const [meta, players, ps, teams] = st.data;
    return { meta, players, pm: new Map(players.map((p) => [p.id, p])), all: entries(ps, players), teams: Object.fromEntries(teams.map((t) => [t.id, t])) };
  }, [st]);

  // Startwerte aus der Adresse, sonst die beiden besten Receiver der aktuellen Saison
  useEffect(() => {
    if (!data) return;
    const q = readQuery();
    const fromUrl = (q.get("p") ?? "")
      .split("~")
      .map((x) => x.split(":"))
      .filter(([id, s]) => data.pm.has(id) && Number(s))
      .map(([id, s]) => ({ player: id, season: Number(s) }))
      .slice(0, 3);
    if (q.get("modus")) setMode(q.get("modus") as Mode);
    if (q.get("rolle") && ROLE_AXES[q.get("rolle")!]) setRole(q.get("rolle")!);
    if (fromUrl.length) {
      setSlots(fromUrl);
      return;
    }
    const s = data.meta.currentSeason;
    const top = data.all.filter((e) => e.season === s && e.role === "WR/TE").sort((a, b) => (b.stats.receivingyards ?? 0) - (a.stats.receivingyards ?? 0)).slice(0, 2);
    setSlots(top.map((e) => ({ player: e.player, season: s })));
  }, [data]);

  useEffect(() => {
    if (slots.length) writeQuery({ p: slots.map((s) => `${s.player}:${s.season}`).join("~"), rolle: role || undefined, modus: mode === "season" ? undefined : mode });
  }, [slots, role, mode]);

  if (!data) return <Loading state={st} />;
  const { meta, players, pm, all, teams } = data;
  const entryOf = (s: Slot): Entry | undefined => all.find((e) => e.player === s.player && e.season === s.season);
  const firstRole = slots.length ? entryOf(slots[0])?.role : null;
  const activeRole = role || firstRole || "WR/TE";
  const axes = ROLE_AXES[activeRole];
  const groupAll = comparisonGroup(all, activeRole, "all");

  const series = slots.map((s, i) => {
    const e = entryOf(s);
    const group = mode === "season" ? comparisonGroup(all, activeRole, s.season) : groupAll;
    const vals = axes.map((k) => {
      const def = stat(k);
      if (!e || !statAvailable(def, e.season, meta.availability)) return { raw: null as number | null, score: null as number | null };
      const raw = value(def, e.stats, e.games);
      const peers = group.filter((g) => statAvailable(def, g.season, meta.availability)).map((g) => value(def, g.stats, g.games)).filter((x): x is number => x !== null);
      if (raw === null || !peers.length) return { raw, score: null };
      if (mode === "max") {
        const best = def.lowerIsBetter ? Math.min(...peers) : Math.max(...peers);
        return { raw, score: Math.max(0, Math.min(100, def.lowerIsBetter ? (raw > 0 ? (best / raw) * 100 : 100) : best > 0 ? (raw / best) * 100 : 0)) };
      }
      return { raw, score: percentile(raw, peers, def.lowerIsBetter) };
    });
    return { slot: s, entry: e, index: i, vals, inGroup: e ? qualified(e, activeRole) && e.role === activeRole : false };
  });

  // Median-Ring: bei Perzentilen 50; bei "Anteil am Bestwert" der Median der Gruppe relativ zum Bestwert
  const medianRing = axes.map((k) => {
    if (mode !== "max") return 50;
    const def = stat(k);
    const peers = groupAll.filter((g) => statAvailable(def, g.season, meta.availability)).map((g) => value(def, g.stats, g.games)).filter((x): x is number => x !== null);
    const med = median(peers);
    if (med === null || !peers.length) return null;
    const best = def.lowerIsBetter ? Math.min(...peers) : Math.max(...peers);
    return def.lowerIsBetter ? (med > 0 ? (best / med) * 100 : 100) : best > 0 ? (med / best) * 100 : 0;
  });

  const groupSize = mode === "season" ? [...new Set(slots.map((s) => s.season))].map((s) => a.groupInSeason(comparisonGroup(all, activeRole, s).length, s)).join(", ") : a.groupAll(groupAll.length, meta.seasons[0], meta.currentSeason);
  const [modeLabel, modeHint] = a.modes[mode];

  return (
    <div>
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SlotPicker
            key={i}
            index={i}
            slot={slots[i]}
            players={players}
            all={all}
            teams={teams}
            onChange={(s) => setSlots((cur) => (s ? Object.assign([...cur], { [i]: s }).filter(Boolean) : cur.filter((_, k) => k !== i)))}
            disabled={i > slots.length}
            hidden={hidden.includes(i)}
            onToggle={() => setHidden((h) => (h.includes(i) ? h.filter((x) => x !== i) : [...h, i]))}
          />
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <Field label={a.axes}>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}>
            <option value="">{a.auto(f.m.stats.roles[firstRole ?? "WR/TE"] ?? "Receiver")}</option>
            {Object.keys(ROLE_AXES).map((r) => <option key={r} value={r}>{f.m.stats.roles[r] ?? r}</option>)}
          </select>
        </Field>
        <Field label={a.normalization}>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={selectCls}>
            {MODES.map((md) => <option key={md} value={md}>{a.modes[md][0]}</option>)}
          </select>
        </Field>
        <span className="flex gap-1.5 pb-1.5">
          <SourceTag kind="derived" detail={modeHint} />
        </span>
      </div>
      <p className="mb-4 max-w-[80ch] text-[13.5px] text-ink-2">
        {a.groupLine(modeHint, f.m.stats.roles[activeRole] ?? activeRole, f.m.stats.qualifier(ROLE_MIN[activeRole]), groupSize)}
        {mode !== "max" ? a.pctMeaning : a.maxMeaning}
      </p>

      {slots.length === 0 ? (
        <p className="text-ink-3">{a.pickOne}</p>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,620px)_1fr]">
          <Radar
            axes={axes.map((k) => f.statLabel(k))}
            median={medianRing}
            medianLabel={mode === "max" ? a.medianMax : f.m.player.medianGroupPct}
            series={series.map((s) => ({
              name: `${pm.get(s.slot.player)?.name} ${s.slot.season}`,
              pct: s.vals.map((v) => v.score),
              raw: s.vals.map((v, k) => (v.raw === null ? f.m.common.notRecordedLong : f.fmtStat(stat(axes[k]), v.raw))),
              hidden: hidden.includes(s.index),
            }))}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-ink-3">
                  <th scope="col" className="py-2 text-left font-medium">{f.m.player.colStat}</th>
                  {series.map((s) => (
                    <th key={s.index} scope="col" className="px-2 py-2 text-right font-medium">
                      <span className="inline-flex items-center gap-1.5 text-ink">
                        <SeriesKey index={s.index} />
                        {pm.get(s.slot.player)?.name.split(" ").slice(-1)[0]} {String(s.slot.season).slice(2)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {axes.map((k, ai) => (
                  <tr key={k} className="border-b border-line last:border-0">
                    <td className="py-2 text-ink-2" title={f.m.stats.formula(stat(k))}>
                      {f.statLabel(k)}
                      {stat(k).lowerIsBetter && <span className="ml-1 text-[11.5px] text-ink-3">{f.m.player.lowerBetter}</span>}
                    </td>
                    {series.map((s) => {
                      const v = s.vals[ai];
                      return (
                        <td key={s.index} className="num px-2 py-2 text-right">
                          <span className="text-ink">{v.raw === null ? f.m.common.notRecorded : f.fmtStat(stat(k), v.raw)}</span>
                          <span className="ml-1.5 text-[12px] text-ink-3">{v.score === null ? "" : Math.round(v.score)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="py-2 text-[12.5px] text-ink-3">{a.gamesRole}</td>
                  {series.map((s) => (
                    <td key={s.index} className="px-2 py-2 text-right text-[12.5px] text-ink-3">
                      {a.gamesShort(s.entry?.games ?? 0)}, {s.entry?.role ?? "–"}
                      {!s.inGroup && <span className="block text-[11.5px]">{a.notInGroup}</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[12.5px] text-ink-3">{a.rawNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotPicker({ index, slot, players, all, teams, onChange, disabled, hidden, onToggle }: {
  index: number; slot?: Slot; players: Player[]; all: Entry[]; teams: Record<string, Team>; onChange: (s: Slot | null) => void; disabled: boolean; hidden: boolean; onToggle: () => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const f = useI18n();
  const a = f.m.analytics;
  const lineName = [f.m.player.lineSolid, f.m.player.lineDashed, f.m.player.lineDotted][index];
  const p = slot ? players.find((x) => x.id === slot.player) : undefined;
  const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const hits = q.length >= 2 ? players.filter((x) => !x.shared && norm(x.name).includes(norm(q))).slice(0, 8) : [];
  const seasons = p ? all.filter((e) => e.player === p.id).map((e) => e.season) : [];
  return (
    <div {...teamsAttr(slot ? all.find((e) => e.player === slot.player && e.season === slot.season)?.teams : undefined)} className={`rounded-xl border bg-surface p-3 ${disabled ? "border-dashed border-line opacity-60" : "border-line"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12.5px] text-ink-3">
          <SeriesKey index={index} /> {a.slot(index + 1, lineName ?? SERIES_STYLE[index].label)}
        </span>
        {p && (
          <span className="flex gap-1">
            <button type="button" onClick={onToggle} className="rounded px-1.5 text-[12px] text-ink-3 hover:text-ink" aria-pressed={!hidden}>{hidden ? a.show : a.hide}</button>
            <button type="button" onClick={() => onChange(null)} className="rounded px-1.5 text-[12px] text-ink-3 hover:text-ink" aria-label={a.removeSlot(index + 1)}>×</button>
          </span>
        )}
      </div>
      {p && slot ? (
        <div className="flex items-center justify-between gap-2">
          <Link href={`/spieler/${p.id}/`} className="truncate text-[15px] font-medium text-ink hover:underline hover:underline-offset-4">{p.name}</Link>
          <select aria-label={f.m.common.season} value={slot.season} onChange={(e) => onChange({ player: p.id, season: Number(e.target.value) })} className={selectCls}>
            {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ) : (
        <div className="relative">
          <input
            type="search"
            disabled={disabled}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={disabled ? a.pickBefore : a.searchPlayer}
            aria-label={a.searchSlot(index + 1)}
            className="h-9 w-full rounded-md border border-line bg-bg px-2.5 text-[14px] text-ink placeholder:text-ink-3"
          />
          {open && hits.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-xl shadow-black/30">
              {hits.map((h) => {
                const last = h.seasons[h.seasons.length - 1];
                return (
                  <li key={h.id} {...teamsAttr(last.teams)}>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange({ player: h.id, season: last.season }); setQ(""); }} className="flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left hover:bg-surface-2">
                      <span className="truncate text-[14px] text-ink">{h.name}</span>
                      <span className="shrink-0 text-[12px] text-ink-3">{last.role ?? ""} {last.teams.map((t) => teams[t]?.abbr).join("/")} {last.season}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

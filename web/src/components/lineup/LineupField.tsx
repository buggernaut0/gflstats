"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FieldPlayer, Unit } from "./types";

const LineupScene = dynamic(() => import("./LineupScene"), { ssr: false });

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Starting Lineup auf dem Feld. Zuerst erscheint eine flache Aufstellung (funktioniert ohne WebGL und
 * ohne nachgeladenen Code); sobald der Bereich sichtbar wird und WebGL verfuegbar ist, uebernimmt die
 * 3D-Szene. Namen, Nummern und Links sind in beiden Faellen dieselben.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function LineupField({ players, colors, teamGames, logo, provisional = false }: { players: FieldPlayer[]; colors: { primary: string; secondary: string }; teamGames: number; logo?: string | null; provisional?: boolean }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [unit, setUnit] = useState<Unit>("offense");
  const [active, setActive] = useState<number | null>(null);
  const [mode, setMode] = useState<"flat" | "3d">("flat");
  const [failed, setFailed] = useState(false);

  // 3D erst laden, wenn der Bereich in die Naehe des Bildschirms kommt
  useEffect(() => {
    if (failed || !webglAvailable()) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setMode("3d");
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, [failed]);

  const shown = active !== null && players[active].unit === unit ? players[active] : null;
  const list = players.map((p, i) => ({ p, i })).filter((x) => x.p.unit === unit);

  return (
    <div style={{ "--lineup-jersey": colors.primary, "--lineup-ink": isLight(colors.primary) ? "#141c28" : "#ffffff" } as React.CSSProperties}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Einheit" className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {(["offense", "defense"] as Unit[]).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={unit === u}
              onClick={() => {
                setUnit(u);
                setActive(null);
              }}
              className={`rounded-md px-3.5 py-1.5 text-[13.5px] font-medium ${unit === u ? "bg-surface-2 text-ink shadow-[inset_0_-2px_0_var(--accent)]" : "text-ink-2 hover:text-ink"}`}
            >
              {u === "offense" ? "Starting Offense" : "Starting Defense"}
            </button>
          ))}
        </div>
        <p className="text-[12.5px] text-ink-3">Anordnung schematisch. Spieler antippen oder überfahren, Klick öffnet das Profil.</p>
      </div>

      <div ref={box} className="lineup-stage relative overflow-hidden rounded-xl border border-line">
        {mode === "3d" && !failed ? (
          <LineupScene players={players} unit={unit} colors={colors} logo={logo ? `${BASE}/${logo}` : null} active={active} onActive={setActive} onOpen={(i) => players[i].id && router.push(`/spieler/${players[i].id}/`)} onFail={() => setFailed(true)} />
        ) : (
          <FlatField list={list} unit={unit} active={active} onActive={setActive} />
        )}

        {/* Infotafel wie eine Bauchbinde im TV */}
        <div className={`pointer-events-none absolute inset-x-3 bottom-3 flex justify-start sm:inset-x-4 sm:bottom-4 ${shown ? "" : "opacity-0"}`} aria-live="polite">
          {shown && (
            <div className="pointer-events-auto flex max-w-full items-stretch overflow-hidden rounded-lg border border-white/15 bg-[#0c1420]/92 text-white shadow-xl shadow-black/40 backdrop-blur">
              {shown.number !== null ? (
                <span className="num display grid min-w-[64px] place-items-center px-3 text-[40px] font-bold leading-none" style={{ background: colors.secondary }}>
                  {shown.number}
                </span>
              ) : (
                <span className="display grid min-w-[64px] place-items-center bg-white/10 px-3 text-[22px] font-bold leading-none">{shown.slot}</span>
              )}
              <span className="min-w-0 px-3.5 py-2">
                <span className="block text-[11.5px] font-medium text-white/65">
                  {shown.number !== null ? `${shown.slot}, ` : ""}{shown.positionLabel}{provisional && shown.position === "DEF" ? ", Platz nach Statistikprofil" : ""}
                </span>
                <span className="display block truncate text-[22px] font-semibold leading-tight">{shown.name}</span>
                <span className="num mt-0.5 block text-[12.5px] text-white/80">
                  {shown.stats.map((s) => `${s.value} ${s.label}`).join(", ")}, {shown.games} von {teamGames} Spielen
                </span>
              </span>
              <Link href={`/spieler/${shown.id}/`} className="grid place-items-center border-l border-white/15 px-3.5 text-[13px] font-medium text-[#f5c63c] hover:bg-white/5">
                Profil
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Dieselbe Aufstellung als Liste: Tastatur, Screenreader und Geraete ohne 3D */}
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={unit === "offense" ? "Starting Offense als Liste" : "Starting Defense als Liste"}>
        {list.map(({ p, i }) => (
          <li key={i}>
            {p.id ? (
              <Link
                href={`/spieler/${p.id}/`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-[13px] ${active === i ? "border-accent bg-accent-soft text-ink" : "border-line text-ink-2 hover:text-ink"}`}
              >
                <span className="text-[11.5px] font-semibold text-ink-3">{p.slot}</span>
                {p.number !== null && <span className="num font-semibold text-ink">{p.number}</span>}
                <span>{p.name}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-2 rounded-md border border-dashed border-line px-2.5 py-1 text-[13px] text-ink-3" title="Niemand erfüllt die Kriterien für diesen Platz">
                <span className="text-[11.5px] font-semibold">{p.slot}</span> nicht belegt
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6;
}

/** Flache Aufstellung von oben: Platzhalter vor dem Laden und Ersatz ohne WebGL. */
function FlatField({ list, unit, active, onActive }: { list: { p: FieldPlayer; i: number }[]; unit: Unit; active: number | null; onActive: (i: number | null) => void }) {
  // Blick von hinter der Einheit: Offense spielt nach oben, Defense steht oben und blickt nach unten
  const sign = unit === "offense" ? 1 : -1;
  return (
    <div className="lineup-flat absolute inset-0">
      <span className="absolute inset-x-0 h-[3px] bg-[#f5c63c]" style={{ top: unit === "offense" ? "34%" : "66%" }} aria-hidden="true" />
      {list.map(({ p, i }) => {
        const left = 50 + (p.x * sign * 100) / 36;
        const top = (unit === "offense" ? 34 : 66) + (p.z * sign * 100) / 22;
        const cls = `absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[13px] font-semibold sm:h-10 sm:w-10 ${
          p.id ? `border-white/70 text-[var(--lineup-ink)] ${active === i ? "ring-2 ring-[#f5c63c]" : ""}` : "border-dashed border-white/35 text-white/45"
        }`;
        const style = { left: `${left}%`, top: `${top}%`, background: p.id ? "var(--lineup-jersey)" : "transparent" };
        return p.id ? (
          <Link key={i} href={`/spieler/${p.id}/`} className={cls} style={style} title={`${p.slot} ${p.name}`} onMouseEnter={() => onActive(i)} onMouseLeave={() => onActive(null)} onFocus={() => onActive(i)} onBlur={() => onActive(null)} tabIndex={-1}>
            <span className={p.number !== null ? "num" : "text-[10.5px]"}>{p.number ?? p.slot}</span>
          </Link>
        ) : (
          <span key={i} className={cls} style={style} title={`${p.slot}: nicht belegt`}>
            <span className="text-[10.5px]">{p.slot}</span>
          </span>
        );
      })}
    </div>
  );
}

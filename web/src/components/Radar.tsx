"use client";

/**
 * Radar-/Spider-Chart auf Perzentil-Skala (0-100). Bei sechs Achsen ein Hexagon.
 * Tiefe entsteht nur durch Schichtung: abgesenkter Boden mit Ringbaendern, darueber die Profile als
 * leicht angehobene Platten mit Schlagschatten. Die Geometrie bleibt flach und unverzerrt - eine
 * gekippte 3D-Ansicht wuerde Achsen perspektivisch verkuerzen und Werte unvergleichbar machen.
 * Farben laut Vorgabe: Spieler 1 gruen, Spieler 2 rot, Spieler 3 blau (validiert);
 * weil Gruen/Rot bei Rot-Gruen-Schwaeche schwer unterscheidbar ist, traegt jeder Spieler
 * zusaetzlich eine eigene Linienart und Punktform.
 */
import { useId, useState } from "react";

export const SERIES_STYLE = [
  { color: "var(--series-1)", dash: "", marker: "circle", label: "durchgezogen" },
  { color: "var(--series-2)", dash: "7 5", marker: "square", label: "gestrichelt" },
  { color: "var(--series-3)", dash: "2 4", marker: "triangle", label: "gepunktet" },
] as const;

export interface RadarSeries {
  name: string;
  /** Perzentil je Achse (0-100) oder null = nicht erfasst */
  pct: (number | null)[];
  /** Rohwert je Achse, fertig formatiert */
  raw: string[];
  hidden?: boolean;
}

export default function Radar({
  axes,
  series,
  medianLabel = "Median der Vergleichsgruppe",
  size = 460,
  median,
}: {
  axes: string[];
  series: RadarSeries[];
  medianLabel?: string;
  size?: number;
  /** Lage des Medians je Achse auf der 0-100-Skala (Standard: 50 = Perzentil-Median) */
  median?: (number | null)[];
}) {
  const [hover, setHover] = useState<{ s: number; a: number } | null>(null);
  const uid = useId().replace(/:/g, "");
  const n = axes.length;
  const R = size / 2;
  const padX = 130;
  const W = size + padX * 2;
  const cx = W / 2;
  const cy = R * 1.16 + 34;
  const H = cy + R * 1.16 + 34;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, p: number) => [cx + Math.cos(ang(i)) * R * (p / 100), cy + Math.sin(ang(i)) * R * (p / 100)] as const;
  const ring = (p: number) => axes.map((_, i) => pt(i, p).join(",")).join(" ");

  const tip = hover ? series[hover.s] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Radar-Vergleich: ${series.map((s) => s.name).join(", ")}`}>
        <defs>
          <radialGradient id={`${uid}-floor`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--radar-floor-in)" />
            <stop offset="100%" stopColor="var(--radar-floor-out)" />
          </radialGradient>
          {SERIES_STYLE.map((st, k) => (
            <radialGradient key={k} id={`${uid}-s${k}`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={R}>
              <stop offset="0%" stopColor={st.color} stopOpacity="0.05" />
              <stop offset="100%" stopColor={st.color} stopOpacity="0.24" />
            </radialGradient>
          ))}
        </defs>
        {/* Boden: Kante nach unten versetzt (wirkt wie eine Platte), darauf Ringbaender im Wechsel */}
        <polygon points={ring(100)} transform="translate(0 7)" fill="var(--radar-edge)" />
        <polygon points={ring(100)} fill={`url(#${uid}-floor)`} stroke="var(--line-strong)" strokeWidth={1.4} strokeLinejoin="round" />
        {[80, 40].map((p) => (
          <path key={p} d={`M${ring(p).split(" ").join("L")}Z M${ring(p - 20).split(" ").join("L")}Z`} fillRule="evenodd" fill="var(--radar-band)" />
        ))}
        {[20, 40, 60, 80].map((p) => (
          <polygon key={p} points={ring(p)} fill="none" stroke="var(--line)" strokeWidth={1} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, 100);
          const on = hover?.a === i;
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={on ? "var(--ink-3)" : "var(--line)"} strokeWidth={on ? 1.4 : 1} />;
        })}
        {axes.map((_, i) => {
          const [x, y] = pt(i, 100);
          return <circle key={i} cx={x} cy={y} r={2.6} fill="var(--line-strong)" />;
        })}
        <polygon points={axes.map((_, i) => pt(i, median?.[i] ?? 50).join(",")).join(" ")} fill="none" stroke="var(--ink-3)" strokeWidth={1.2} strokeDasharray="3 4" />
        {axes.map((label, i) => {
          const [x, y] = pt(i, 116);
          const anchor = Math.abs(x - cx) < 4 ? "middle" : x > cx ? "start" : "end";
          const words = label.split(" ");
          const lines = label.length > 16 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [label];
          return (
            <text key={i} x={x} y={y + (y < cy - 4 ? -4 : y > cy + 4 ? 10 : 4) - (lines.length - 1) * 7} textAnchor={anchor} fontSize="13" fill={hover?.a === i ? "var(--ink)" : "var(--ink-2)"} fontWeight={hover?.a === i ? 600 : 500}>
              {lines.map((l, k) => (
                <tspan key={k} x={x} dy={k ? 15 : 0}>
                  {l}
                </tspan>
              ))}
            </text>
          );
        })}
        {series.map((s, si) => {
          if (s.hidden) return null;
          const st = SERIES_STYLE[si];
          const pts = s.pct.map((p, i) => pt(i, p ?? 0));
          return (
            <g key={si} opacity={hover && hover.s !== si ? 0.45 : 1} style={{ filter: `drop-shadow(0 ${hover?.s === si ? 9 : 5}px ${hover?.s === si ? 8 : 5}px var(--radar-shadow))` }}>
              <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={`url(#${uid}-s${si})`} stroke={st.color} strokeWidth={2.4} strokeDasharray={st.dash} strokeLinejoin="round" />
              {pts.map(([x, y], i) =>
                s.pct[i] === null ? null : (
                  <g key={i} onMouseEnter={() => setHover({ s: si, a: i })} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
                    <circle cx={x} cy={y} r={14} fill="transparent" />
                    <Marker kind={st.marker} x={x} y={y} color={st.color} active={hover?.s === si && hover.a === i} />
                  </g>
                ),
              )}
            </g>
          );
        })}
        {[20, 40, 60, 80].map((p) => (
          <text key={p} x={cx + 4} y={cy - (R * p) / 100 - 3} fontSize="10.5" fill="var(--ink-3)" style={{ paintOrder: "stroke" }} stroke="var(--radar-floor-in)" strokeWidth={3} strokeOpacity={0.7}>
            {p}
          </text>
        ))}
      </svg>
      {tip && hover && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] shadow-lg shadow-black/30">
          <p className="font-medium text-ink">{tip.name}</p>
          <p className="text-ink-2">
            {axes[hover.a]}: <span className="num font-semibold text-ink">{tip.raw[hover.a]}</span>
          </p>
          <p className="text-ink-3">{tip.pct[hover.a] === null ? "nicht erfasst" : `${Math.round(tip.pct[hover.a]!)}. Perzentil`}</p>
        </div>
      )}
      <p className="mt-1 flex items-center justify-center gap-2 text-[12.5px] text-ink-3">
        <svg width="26" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="26" y2="4" stroke="var(--ink-3)" strokeWidth="1.2" strokeDasharray="3 4" />
        </svg>
        {medianLabel}
      </p>
    </div>
  );
}

function Marker({ kind, x, y, color, active }: { kind: string; x: number; y: number; color: string; active: boolean }) {
  const r = active ? 6.5 : 5;
  const common = { fill: color, stroke: "var(--surface)", strokeWidth: 2 };
  if (kind === "square") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} {...common} />;
  if (kind === "triangle") return <polygon points={`${x},${y - r * 1.2} ${x + r * 1.1},${y + r * 0.8} ${x - r * 1.1},${y + r * 0.8}`} {...common} />;
  return <circle cx={x} cy={y} r={r} {...common} />;
}

/** Legenden-Eintrag mit Linienart und Punktform, passend zum Radar. */
export function SeriesKey({ index }: { index: number }) {
  const st = SERIES_STYLE[index];
  return (
    <svg width="34" height="12" aria-hidden="true" className="shrink-0">
      <line x1="1" y1="6" x2="33" y2="6" stroke={st.color} strokeWidth="2.4" strokeDasharray={st.dash} />
      <Marker kind={st.marker} x={17} y={6} color={st.color} active={false} />
    </svg>
  );
}

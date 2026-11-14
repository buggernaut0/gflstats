import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SceneModel, SceneSpotlight } from '../data/sceneModel';
import type { DataIndex } from '../data/types';
import type { SpotlightReason } from './scoring';
import { GROUP_LABEL, GROUP_NAME, lastName } from '../data/names';
import { ASSET_BASE } from '../paths';
import { PlayerPortrait } from './PlayerPortrait';
import './spotlight.css';

const nf = (digits: number) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmt = (x: number, digits = 0) => nf(digits).format(x);
/** Ganze Zahlen ohne, halbe Tackles/Sacks mit einer Nachkommastelle. */
const fmtTotal = (x: number) => fmt(x, Number.isInteger(x) ? 0 : 1);

const TIER: Record<string, string> = { elite: 'Elite', star: 'Star', key: 'Schlüsselspieler' };

/** Akzentfarbe, die auf dem dunklen Kartenhintergrund lesbar bleibt (sehr dunkle Teamfarben werden aufgehellt). */
function readable(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((u) => u / 255);
  const lin = ch.map((u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return L < 0.1 ? `color-mix(in srgb, ${hex} 45%, #f1f2f0)` : hex;
}

/** Zählt beim Einblenden von 0 auf den Zielwert hoch (ohne Animation bei „Bewegung reduzieren“). */
function useCountUp(target: number, delay: number, duration = 900) {
  const [value, setValue] = useState(0);
  const reduced = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (reduced.current) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const x = Math.min(Math.max((now - start) / duration, 0), 1);
      setValue(target * (1 - Math.pow(1 - x, 3)));
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delay, duration]);
  return value;
}

function StatRow({ r, i, peers }: { r: SpotlightReason; i: number; peers: string }) {
  const delay = 1150 + i * 160;
  const target = r.display === 'percent' ? r.value * 100 : r.value;
  const shown = useCountUp(target, delay);
  // Summen zählen in ganzen (bzw. halben, bei geteilten Tackles/Sacks) Schritten
  const step = Number.isInteger(target) ? 1 : 2;
  const main =
    r.display === 'total' ? fmtTotal(Math.round(shown * step) / step)
      : r.display === 'rate' ? fmt(shown, 1)
        : `${fmt(shown, 1)} %`;
  const sub = r.display === 'total'
    ? `${fmt(r.perGame ?? 0, 1)} pro Spiel`
    : `bei ${fmt(r.den ?? 0)} ${r.denLabel ?? ''}${r.better === 'low' ? ' · niedrig ist gut' : ''}`;
  const top = Math.max(1, 100 - r.pct);
  return (
    <li className="tv-spot__stat" style={{ ['--i' as string]: i, ['--pct' as string]: `${r.pct}%` } as CSSProperties}>
      <b className="tv-spot__val">{main}</b>
      <span className="tv-spot__label">{r.label}</span>
      <span className="tv-spot__sub">{sub}</span>
      <span className="tv-spot__pct" title={`Perzentil ${r.pct} unter ${peers} der Liga`}>Top {top} %</span>
      <i className="tv-spot__bar" aria-hidden="true" />
    </li>
  );
}

/**
 * Spielerkarte des Player Spotlights. Steht im Bild gegenüber dem Spieler, den die Kamera gerade
 * zeigt (Offense: Karte rechts, Defense: Karte links). Fährt nach dem Schnitt ein und kurz vor dem
 * Ende der Einstellung wieder heraus (--dur = Dauer der Einstellung).
 */
export function SpotlightCard({ model, spot, duration, index }: {
  model: SceneModel;
  spot: SceneSpotlight;
  duration: number;
  index: DataIndex;
}) {
  const { pick, player } = spot;
  const team = player.team;
  const kit = spot.side === 'offense' ? model.offenseKit : model.defenseKit;
  const accent = readable(spot.side === 'offense' ? team.colors.accent : team.colors.secondary);
  const name = player.player?.name ?? pick.id;
  const last = lastName(name);
  const first = name.slice(0, Math.max(0, name.length - last.length)).trim();
  const number = player.player?.number ?? null;
  const group = pick.group as keyof typeof GROUP_LABEL;
  const offense = spot.side === 'offense';
  // Offense: Position genügt (QB · Quarterback). Defense: Statistikprofil, weil DL/LB/DB ohne Kader nicht belegt sind
  const role = offense ? GROUP_NAME[group] ?? pick.profileLabel : pick.profileLabel;
  const rankText = offense
    ? `#${pick.rank} von ${pick.of} ${pick.peers}`
    : `#${pick.rank} von ${pick.of} ${pick.peers} · ${pick.profileLabel}-Profil`;
  const built = index.source?.builtAt ? new Date(index.source.builtAt) : null;
  const stand = built && !Number.isNaN(built.getTime()) ? built.toLocaleDateString('de-DE') : null;

  const style = {
    '--team': team.colors.primary,
    '--team2': team.colors.secondary,
    '--accent': accent,
    '--dur': `${duration}s`,
  } as CSSProperties;

  return (
    <aside
      className={`tv-spot tv-spot--${offense ? 'right' : 'left'} tv-spot--${pick.tier}`}
      style={style}
      aria-label={`Player Spotlight: ${name}, ${role}, ${team.name}`}
    >
      <div className="tv-spot__kicker">
        <span className="tv-spot__kick-main">Player Spotlight</span>
        <span className="tv-spot__kick-side">{offense ? 'Offense' : 'Defense'} {spot.rank}/{spot.ofSide}</span>
        <span className="tv-spot__tier">{TIER[pick.tier]}</span>
      </div>

      <div className="tv-spot__card">
        <div className="tv-spot__sheen" aria-hidden="true" />
        <div className="tv-spot__media">
          {number != null && <span className="tv-spot__bignum" aria-hidden="true">{number}</span>}
          <PlayerPortrait kit={kit} number={number} photo={pick.photo ? `${ASSET_BASE}/${pick.photo}` : null} alt={name} />
        </div>

        <div className="tv-spot__body">
          <div className="tv-spot__team">
            {team.logo && <img src={team.logo} alt="" draggable={false} />}
            <span>{team.name}</span>
          </div>
          <div className="tv-spot__pos">
            <b>{GROUP_LABEL[group] ?? pick.group}</b>
            {number != null && <b className="tv-spot__num">#{number}</b>}
            <span>{role}</span>
          </div>
          <h2 className="tv-spot__name">
            {first && <small>{first}</small>}
            <span>{last}</span>
          </h2>
          <div className="tv-spot__rank">
            <span>{rankText}</span>
            <span className="tv-spot__score" title="Profilwert: gewichteter Mittelwert der Liga-Perzentile (0–100)">
              Profilwert <b>{Math.round(pick.score)}</b>
            </span>
          </div>
          <ul className="tv-spot__stats">
            {pick.reasons.map((r, i) => <StatRow key={r.metric} r={r} i={i} peers={pick.peers} />)}
          </ul>
          <div className="tv-spot__foot">
            Saison {model.season.season} · {pick.games} Spiele für {team.abbreviation}
            {stand ? ` · Datenstand ${stand}` : ''} · Auswahl nach Liga-Perzentilen
          </div>
        </div>
      </div>
    </aside>
  );
}

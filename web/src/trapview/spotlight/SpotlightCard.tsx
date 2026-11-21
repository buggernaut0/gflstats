import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { eliteOf, matchupOf, type SceneModel, type ScenePlayer, type SceneSpotlight } from '../data/sceneModel';
import { familyOf, statLines } from '../matchup/compare';
import { useI18n } from '../../i18n/react';
import { lineText, lineValue } from '../i18n';
import type { DataIndex } from '../data/types';
import EliteBadge from '../../components/EliteBadge';
import type { SpotlightReason } from './scoring';
import { GROUP_LABEL, lastName } from '../data/names';
import { photoUrl } from '../../lib/photo';
import { PlayerPortrait } from './PlayerPortrait';
import './spotlight.css';


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
function useCountUp(target: number, delay: number, duration = 700) {
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
  const f = useI18n();
  const tv = f.m.trapview;
  const fmt = (x: number, digits = 0) => f.fmtDec(x, digits);
  /** Ganze Zahlen ohne, halbe Tackles/Sacks mit einer Nachkommastelle. */
  const fmtTotal = (x: number) => fmt(x, Number.isInteger(x) ? 0 : 1);
  const text = tv.reasons[r.metric];
  const delay = 250 + i * 60;
  const target = r.display === 'percent' ? r.value * 100 : r.value;
  const shown = useCountUp(target, delay);
  // Summen zählen in ganzen (bzw. halben, bei geteilten Tackles/Sacks) Schritten
  const step = Number.isInteger(target) ? 1 : 2;
  const main =
    r.display === 'total' ? fmtTotal(Math.round(shown * step) / step)
      : r.display === 'rate' ? fmt(shown, 1)
        : f.lang === 'en' ? `${fmt(shown, 1)}%` : `${fmt(shown, 1)} %`;
  const sub = r.display === 'total'
    ? tv.perGame(fmt(r.perGame ?? 0, 1))
    : `${tv.onDen(fmt(r.den ?? 0), text?.den ?? r.denLabel ?? '')}${r.better === 'low' ? tv.lowGood : ''}`;
  const top = Math.max(1, 100 - r.pct);
  return (
    <li className="tv-spot__stat" style={{ ['--i' as string]: i, ['--pct' as string]: `${r.pct}%` } as CSSProperties}>
      <b className="tv-spot__val">{main}</b>
      <span className="tv-spot__label">{text?.label ?? r.label}</span>
      <span className="tv-spot__sub">{sub}</span>
      <span className="tv-spot__pct" title={tv.pctTitle(r.pct, peers)}>{tv.top(top)}</span>
      <i className="tv-spot__bar" aria-hidden="true" />
    </li>
  );
}

/** Gegenspieler im Duell (Receiver ↔ Passverteidiger): steht mit auf der Karte, damit das Matchup sofort klar ist. */
function Opponent({ p, index, model }: { p: ScenePlayer; index: DataIndex; model: SceneModel }) {
  const elite = eliteOf(p);
  const fam = familyOf(p);
  const lines = fam && p.player ? statLines(p.player, fam, index, model.season).slice(0, 2) : [];
  const f = useI18n();
  return (
    <div className={`tv-spot__opp${elite ? ' is-elite' : ''}`}>
      <span className="tv-spot__opp-k">{f.m.trapview.opponent}</span>
      <span className="tv-spot__opp-who">
        <b>{p.posLabel}{p.player?.number != null ? ` #${p.player.number}` : ''}</b> {p.player?.name} · {p.team.abbreviation}
      </span>
      {elite && <EliteBadge entry={elite} size="md" season={model.season.season} className="tv-spot__opp-elite" />}
      {lines.length > 0 && <span className="tv-spot__opp-stats">{lines.map((l) => `${lineValue(l, f)} ${lineText(l, f).abbr}`).join(' · ')}</span>}
    </div>
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
  const f = useI18n();
  const tv = f.m.trapview;
  const prof = tv.profiles[pick.profile] ?? { label: pick.profileLabel, peers: pick.peers };
  const role = offense ? f.m.stats.positions[group] ?? prof.label : prof.label;
  const rankText = offense
    ? tv.rankText(pick.rank, pick.of, prof.peers)
    : `${tv.rankText(pick.rank, pick.of, prof.peers)}${tv.profileSuffix(prof.label)}`;
  const built = index.source?.builtAt ? new Date(index.source.builtAt) : null;
  const stand = built && !Number.isNaN(built.getTime()) ? built.toLocaleDateString(f.locale) : null;
  const duel = matchupOf(model, player);
  const opponent = duel ? (duel.offense.id === player.id ? duel.defense : duel.offense) : null;

  const style = {
    '--team': team.colors.primary,
    '--team2': team.colors.secondary,
    '--accent': accent,
    '--dur': `${duration}s`,
  } as CSSProperties;

  return (
    <aside
      className={`tv-spot tv-spot--${offense ? 'right' : 'left'} tv-spot--${pick.tier}${pick.elite ? ' is-elite' : ''}`}
      style={style}
      aria-label={tv.spotlightAria(name, role, team.name)}
    >
      <div className="tv-spot__kicker">
        <span className="tv-spot__kick-main">Player Spotlight</span>
        <span className="tv-spot__kick-side">{offense ? 'Offense' : 'Defense'} {spot.rank}/{spot.ofSide}</span>
        {!pick.elite && <span className="tv-spot__tier">{tv.tiers[pick.tier]}</span>}
      </div>

      <div className="tv-spot__card">
        <div className="tv-spot__sheen" aria-hidden="true" />
        <div className="tv-spot__media">
          {number != null && <span className="tv-spot__bignum" aria-hidden="true">{number}</span>}
          <PlayerPortrait kit={kit} number={number} photo={photoUrl(pick.photo)} alt={name} />
        </div>

        <div className="tv-spot__body">
          {pick.elite && <EliteBadge entry={pick.elite} size="lg" season={model.season.season} className="tv-spot__elite" />}
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
            <span className="tv-spot__score" title={tv.profileScoreHint}>
              {tv.profileScore} <b>{Math.round(pick.score)}</b>
            </span>
          </div>
          <ul className="tv-spot__stats">
            {pick.reasons.map((r, i) => <StatRow key={r.metric} r={r} i={i} peers={prof.peers} />)}
          </ul>
          {opponent && <Opponent p={opponent} index={index} model={model} />}
          <div className="tv-spot__foot">
            {tv.cardFoot(model.season.season, pick.games, team.abbreviation, stand)}
          </div>
        </div>
      </div>
    </aside>
  );
}

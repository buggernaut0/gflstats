import type { CSSProperties } from 'react';
import type { SceneMatchup, ScenePlayer } from '../data/sceneModel';

function Card({ p, align }: { p: ScenePlayer; align: 'left' | 'right' }) {
  const accent = p.side === 'offense' ? p.team.colors.accent : p.team.colors.secondary;
  return (
    <div className={`tv-card tv-card--${align}`} style={{ '--accent': accent } as CSSProperties}>
      <div className="tv-card__num">{p.player.number}</div>
      <div className="tv-card__info">
        <div className="tv-card__pos">{p.player.position} · {p.team.abbreviation}</div>
        <div className="tv-card__name">{p.player.name}</div>
      </div>
    </div>
  );
}

/** Vergleichsfenster für ein Duell. Die Werte sind im Prototyp reine Beispieldaten. */
export function MatchupPanel({ matchup, isSampleData, onClose }: {
  matchup: SceneMatchup;
  isSampleData: boolean;
  onClose: () => void;
}) {
  const { offense, defense, stats } = matchup;
  const fmt = (v: number, unit?: string) => `${v}${unit ? (unit === '%' ? '%' : ` ${unit}`) : ''}`;
  return (
    <div className="tv-panel" key={matchup.id}>
      <div className="tv-panel__head">
        <Card p={offense} align="left" />
        <div className="tv-panel__vs">VS</div>
        <Card p={defense} align="right" />
      </div>
      <div className="tv-panel__stats">
        {stats.map((s) => {
          const total = s.offense + s.defense || 1;
          const oBetter = s.lowerIsBetter ? s.offense < s.defense : s.offense > s.defense;
          const dBetter = s.lowerIsBetter ? s.defense < s.offense : s.defense > s.offense;
          return (
            <div className="tv-stat" key={s.label}>
              <span className={`tv-stat__val${oBetter ? ' is-better' : ''}`}>{fmt(s.offense, s.unit)}</span>
              <div className="tv-stat__mid">
                <span className="tv-stat__label">{s.label}</span>
                <div className="tv-stat__bar">
                  <i style={{ width: `${(s.offense / total) * 100}%`, background: offense.team.colors.accent }} />
                  <i style={{ width: `${(s.defense / total) * 100}%`, background: defense.team.colors.secondary }} />
                </div>
              </div>
              <span className={`tv-stat__val tv-stat__val--r${dBetter ? ' is-better' : ''}`}>{fmt(s.defense, s.unit)}</span>
            </div>
          );
        })}
      </div>
      <div className="tv-panel__foot">
        {isSampleData && <span className="tv-tag">Sample data · illustrative values</span>}
        <button className="tv-btn" onClick={onClose}>Resume</button>
      </div>
    </div>
  );
}

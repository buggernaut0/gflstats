import type { CSSProperties } from 'react';
import type { SceneMatchup, ScenePlayer } from '../data/sceneModel';
import type { DataIndex, SeasonData } from '../data/types';
import { GROUP_NAME } from '../data/names';
import { familyOf, headToHead, rankOf, statLines, type HeadToHead, type RankView } from './compare';

const accentOf = (p: ScenePlayer) => (p.side === 'offense' ? p.team.colors.accent : p.team.colors.secondary);

function Card({ p, align }: { p: ScenePlayer; align: 'left' | 'right' }) {
  const player = p.player!;
  return (
    <div className={`tv-card tv-card--${align}`} style={{ '--accent': accentOf(p) } as CSSProperties}>
      {player.number != null && <div className="tv-card__num">{player.number}</div>}
      <div className="tv-card__info">
        <div className="tv-card__pos" title={GROUP_NAME[p.dataGroup]}>{p.posLabel} · {p.team.abbreviation}</div>
        <div className="tv-card__name">{player.name}</div>
        <div className="tv-card__meta">{player.games} {player.games === 1 ? 'Spiel' : 'Spiele'} · {p.team.name}</div>
      </div>
    </div>
  );
}

function Lines({ p, index, season, align }: { p: ScenePlayer; index: DataIndex; season: SeasonData; align: 'left' | 'right' }) {
  const fam = familyOf(p);
  if (!fam || !p.player) return <div className={`tv-lines tv-lines--${align}`} />;
  return (
    <dl className={`tv-lines tv-lines--${align}`}>
      {statLines(p.player, fam, index, season).map((l) => (
        <div className="tv-line" key={l.key}>
          <dt>{l.label}</dt>
          <dd>
            <b>{l.value}</b>
            {l.sub && <small>{l.sub}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RankCell({ r, align }: { r: RankView | null; align: 'l' | 'r' }) {
  if (!r) return <span className={`tv-rank__val tv-rank__val--${align} is-na`}><small>keine Einordnung</small></span>;
  return (
    <span className={`tv-rank__val tv-rank__val--${align}`}>
      <b>{r.rank.pct}</b>
      <small>Rang {r.rank.rank} von {r.rank.of}</small>
    </span>
  );
}

/** Positionsübergreifender Vergleich: beide Perzentile auf derselben Skala, von der Mitte nach außen. */
function RankBar({ o, d, oColor, dColor }: { o: RankView | null; d: RankView | null; oColor: string; dColor: string }) {
  return (
    <div className="tv-rank">
      <RankCell r={o} align="l" />
      <div className="tv-rank__mid">
        <span className="tv-rank__label">Liga-Perzentil · eigene Positionsgruppe</span>
        <div className="tv-rank__bars">
          <div className="tv-rank__half tv-rank__half--l"><i style={{ width: `${o?.rank.pct ?? 0}%`, background: oColor }} /></div>
          <div className="tv-rank__half tv-rank__half--r"><i style={{ width: `${d?.rank.pct ?? 0}%`, background: dColor }} /></div>
        </div>
        <span className="tv-rank__basis">
          <span>{o?.label ?? '–'}</span>
          <span>{d?.label ?? '–'}</span>
        </span>
      </div>
      <RankCell r={d} align="r" />
    </div>
  );
}

/** Kurzformen statt Langnamen – kompakt und ohne falsche Mehrzahl ("1 INT" statt "1 Interceptions"). */
const h2hText = (h: HeadToHead | null) => (h ? h.lines.map((l) => `${l.value} ${l.abbr}`).join(' · ') : '–');

/** Vergleichsfenster für ein Duell – nur echte Werte der gewählten Saison. */
export function MatchupPanel({ matchup, index, season, onClose }: {
  matchup: SceneMatchup;
  index: DataIndex;
  season: SeasonData;
  onClose: () => void;
}) {
  const { offense, defense } = matchup;
  const of = familyOf(offense);
  const df = familyOf(defense);
  const oRank = of && offense.player ? rankOf(offense.player, of, index) : null;
  const dRank = df && defense.player ? rankOf(defense.player, df, index) : null;
  const oH2H = of ? headToHead(offense, defense.team.id, of, index, season) : null;
  const dH2H = df ? headToHead(defense, offense.team.id, df, index, season) : null;
  const h2hGames = Math.max(oH2H?.games ?? 0, dH2H?.games ?? 0);

  return (
    <div className="tv-panel" key={matchup.id}>
      <div className="tv-panel__head">
        <Card p={offense} align="left" />
        <div className="tv-panel__vs">VS</div>
        <Card p={defense} align="right" />
      </div>

      <RankBar o={oRank} d={dRank} oColor={accentOf(offense)} dColor={accentOf(defense)} />

      <div className="tv-panel__cols">
        <Lines p={offense} index={index} season={season} align="left" />
        <div className="tv-panel__colhead">Saison<br />{season.season}</div>
        <Lines p={defense} index={index} season={season} align="right" />
      </div>

      {h2hGames > 0 && (
        <div className="tv-h2h">
          <span className="tv-h2h__side" title={oH2H?.lines.map((l) => `${l.label}: ${l.value}`).join(' · ')}>{h2hText(oH2H)}</span>
          <span className="tv-h2h__label">
            Direktes Duell
            <small>{h2hGames} {h2hGames === 1 ? 'Spiel' : 'Spiele'} gegeneinander</small>
          </span>
          <span className="tv-h2h__side tv-h2h__side--r" title={dH2H?.lines.map((l) => `${l.label}: ${l.value}`).join(' · ')}>{h2hText(dH2H)}</span>
        </div>
      )}

      <div className="tv-panel__foot">
        <details className="tv-panel__note">
          <summary>Quelle &amp; Berechnung</summary>
          GFL-Statistikbögen {season.season}, Regular Season + Playoffs. Perzentil = Anteil der Vergleichsgruppe mit
          niedrigerem Wert pro Spiel (gleiche Rolle, mind. {index.method.poolMinGames} Spiele) – links unter{' '}
          {oRank?.peers ?? '–'}, rechts unter {dRank?.peers ?? '–'}. „Direktes Duell“: Werte aus den Spielen der
          beiden Teams gegeneinander, keine Deckungsdaten. Die Duelle stellen den Receiver mit den meisten Receiving
          Yards dem Passverteidiger mit den meisten Interceptions + abgewehrten Pässen gegenüber (usw.) – die Bögen
          enthalten keine Angaben, wer wen gedeckt hat.
        </details>
        <button className="tv-btn" onClick={onClose}>Resume</button>
      </div>
    </div>
  );
}

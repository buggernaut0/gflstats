import type { CSSProperties } from 'react';
import type { SceneMatchup, SceneModel, ScenePlayer } from '../data/sceneModel';
import { screenSides } from '../camera/matchupView';
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
function RankBar({ l, r, lColor, rColor }: { l: RankView | null; r: RankView | null; lColor: string; rColor: string }) {
  return (
    <div className="tv-rank">
      <RankCell r={l} align="l" />
      <div className="tv-rank__mid">
        <span className="tv-rank__label">Liga-Perzentil · eigene Positionsgruppe</span>
        <div className="tv-rank__bars">
          <div className="tv-rank__half tv-rank__half--l"><i style={{ width: `${l?.rank.pct ?? 0}%`, background: lColor }} /></div>
          <div className="tv-rank__half tv-rank__half--r"><i style={{ width: `${r?.rank.pct ?? 0}%`, background: rColor }} /></div>
        </div>
        <span className="tv-rank__basis">
          <span>{l?.label ?? '–'}</span>
          <span>{r?.label ?? '–'}</span>
        </span>
      </div>
      <RankCell r={r} align="r" />
    </div>
  );
}

/** Kurzformen statt Langnamen – kompakt und ohne falsche Mehrzahl ("1 INT" statt "1 Interceptions"). */
const h2hText = (h: HeadToHead | null) => (h ? h.lines.map((l) => `${l.value} ${l.abbr}`).join(' · ') : '–');

/** Kennzahlen eines Spielers im Duell – Einordnung und Werte gegen das Team des Gegenübers. */
function sideOf(p: ScenePlayer, opponent: ScenePlayer, index: DataIndex, season: SeasonData) {
  const fam = familyOf(p);
  return {
    p,
    rank: fam && p.player ? rankOf(p.player, fam, index) : null,
    h2h: fam ? headToHead(p, opponent.team.id, fam, index, season) : null,
  };
}

/**
 * Vergleichsfenster für ein Duell – nur echte Werte der gewählten Saison.
 * Die Spalten folgen dem Bild: links steht, wer in der Duell-Kamera links steht (siehe screenSides),
 * unabhängig davon, ob das Offense oder Defense ist.
 */
export function MatchupPanel({ model, matchup, index, season, onClose }: {
  model: SceneModel;
  matchup: SceneMatchup;
  index: DataIndex;
  season: SeasonData;
  onClose: () => void;
}) {
  const [lp, rp] = screenSides(model, matchup);
  const L = sideOf(lp, rp, index, season);
  const R = sideOf(rp, lp, index, season);
  const h2hGames = Math.max(L.h2h?.games ?? 0, R.h2h?.games ?? 0);

  return (
    <div className="tv-panel" key={matchup.id}>
      <div className="tv-panel__head">
        <Card p={lp} align="left" />
        <div className="tv-panel__vs">VS</div>
        <Card p={rp} align="right" />
      </div>

      <RankBar l={L.rank} r={R.rank} lColor={accentOf(lp)} rColor={accentOf(rp)} />

      <div className="tv-panel__cols">
        <Lines p={lp} index={index} season={season} align="left" />
        <div className="tv-panel__colhead">Saison<br />{season.season}</div>
        <Lines p={rp} index={index} season={season} align="right" />
      </div>

      {h2hGames > 0 && (
        <div className="tv-h2h">
          <span className="tv-h2h__side" title={L.h2h?.lines.map((l) => `${l.label}: ${l.value}`).join(' · ')}>{h2hText(L.h2h)}</span>
          <span className="tv-h2h__label">
            Direktes Duell
            <small>{h2hGames} {h2hGames === 1 ? 'Spiel' : 'Spiele'} gegeneinander</small>
          </span>
          <span className="tv-h2h__side tv-h2h__side--r" title={R.h2h?.lines.map((l) => `${l.label}: ${l.value}`).join(' · ')}>{h2hText(R.h2h)}</span>
        </div>
      )}

      <div className="tv-panel__foot">
        <details className="tv-panel__note">
          <summary>Quelle &amp; Berechnung</summary>
          GFL-Statistikbögen {season.season}, Regular Season + Playoffs. Perzentil = Anteil der Vergleichsgruppe mit
          niedrigerem Wert pro Spiel (gleiche Rolle, mind. {index.method.poolMinGames} Spiele) – links unter{' '}
          {L.rank?.peers ?? '–'}, rechts unter {R.rank?.peers ?? '–'}. „Direktes Duell“: Werte aus den Spielen der
          beiden Teams gegeneinander, keine Deckungsdaten. Die Duelle stellen den Receiver mit den meisten Receiving
          Yards dem Passverteidiger mit den meisten Interceptions + abgewehrten Pässen gegenüber (usw.) – die Bögen
          enthalten keine Angaben, wer wen gedeckt hat.
        </details>
        <button className="tv-btn" onClick={onClose}>Resume</button>
      </div>
    </div>
  );
}

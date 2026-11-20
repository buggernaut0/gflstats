import type { CSSProperties } from 'react';
import EliteBadge from '../../components/EliteBadge';
import { eliteOf, type SceneMatchup, type SceneModel, type ScenePlayer } from '../data/sceneModel';
import type { DataIndex, SeasonData } from '../data/types';
import { lastName } from '../data/names';
import { useI18n } from '../../i18n/react';
import { lineText, lineValue, rankText } from '../i18n';
import { screenSides } from '../camera/matchupView';
import { familyOf, rankOf, statLines } from './compare';

/** Akzentfarbe je Seite wie in Labels und Vergleichsfenster. */
const accentOf = (p: ScenePlayer) => (p.side === 'offense' ? p.team.colors.accent : p.team.colors.secondary);

/** Kompaktes Profil eines Duellanten: Kopf, Elite-Plakette, Kennzahlen seiner Aufgabe, Liga-Einordnung. */
function Profile({ p, align, index, season }: { p: ScenePlayer; align: 'left' | 'right'; index: DataIndex; season: SeasonData }) {
  const player = p.player!;
  const elite = eliteOf(p);
  const fam = familyOf(p);
  const lines = fam ? statLines(player, fam, index, season).slice(0, 4) : [];
  const rank = fam ? rankOf(player, fam, index) : null;
  const last = lastName(player.name);
  const first = player.name.slice(0, Math.max(0, player.name.length - last.length)).trim();
  const f = useI18n();
  const tv = f.m.trapview;

  return (
    <section
      className={`tv-duel__side tv-duel__side--${align}${elite ? ' is-elite' : ''}`}
      style={{ '--accent': accentOf(p), '--team': p.team.colors.primary } as CSSProperties}
      aria-label={`${player.name}, ${f.m.stats.positions[p.dataGroup] ?? p.posLabel}, ${p.team.name}${elite ? ', Elite' : ''}`}
    >
      <div className="tv-duel__head">
        {player.number != null && <span className="tv-duel__num" aria-hidden="true">{player.number}</span>}
        <div className="tv-duel__id">
          <span className="tv-duel__pos">
            {p.team.logo && <img src={p.team.logo} alt="" draggable={false} />}
            <b>{p.posLabel}</b>
            {player.number != null && <b>#{player.number}</b>}
            <span>{p.team.abbreviation}</span>
          </span>
          <span className="tv-duel__name">
            {first && <small>{first}</small>}
            <span>{last}</span>
          </span>
        </div>
      </div>
      {elite && <EliteBadge entry={elite} size="lg" season={season.season} className="tv-duel__elite" />}
      {lines.length > 0 ? (
        <dl className="tv-duel__stats">
          {lines.map((l) => (
            <div key={l.key} title={lineText(l, f).label}>
              <dd>{lineValue(l, f)}</dd>
              <dt>{lineText(l, f).abbr}</dt>
            </div>
          ))}
        </dl>
      ) : (
        <p className="tv-duel__none">{tv.noStats}</p>
      )}
      <div className="tv-duel__rank">
        {rank ? (
          <>
            <i style={{ width: `${rank.rank.pct}%` }} aria-hidden="true" />
            <span>
              <b>{tv.rank(rank.rank.rank)}</b>{tv.ofLabel(rank.rank.of, rankText(rank, f).label)}
            </span>
          </>
        ) : (
          <span>{tv.noRank(f.m.common.gamesN(player.games))}</span>
        )}
      </div>
    </section>
  );
}

/**
 * Duell-Bauchbinde der laufenden Präsentation: beide Spieler eines Matchups mit Profil und Kennzahlen,
 * vom ersten Bild der Duell-Einstellung an (alle Werte liegen schon im Szenenmodell – nichts wird nachgeladen).
 * Die Seiten folgen dem Bild: links, wer in der Duell-Kamera links steht (screenSides).
 */
export function DuelBar({ model, matchup, index }: { model: SceneModel; matchup: SceneMatchup; index: DataIndex }) {
  const [l, r] = screenSides(model, matchup);
  const { m } = useI18n();
  return (
    <div className="tv-duel" role="group" aria-label={m.trapview.matchupAria(l.player!.name, r.player!.name)}>
      <Profile p={l} align="left" index={index} season={model.season} />
      <div className="tv-duel__vs" aria-hidden="true">
        <span>{l.posLabel}</span>
        <b>VS</b>
        <span>{r.posLabel}</span>
        <small>{m.trapview.seasonTag(model.season.season)}</small>
      </div>
      <Profile p={r} align="right" index={index} season={model.season} />
    </div>
  );
}

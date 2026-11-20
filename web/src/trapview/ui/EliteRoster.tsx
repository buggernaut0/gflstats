import type { CSSProperties } from 'react';
import { EliteCrest } from '../../components/EliteBadge';
import { eliteOf, type SceneModel, type ScenePlayer } from '../data/sceneModel';
import type { Side, Team } from '../data/types';

function RosterSide({ team, side, players }: { team: Team; side: Side; players: ScenePlayer[] }) {
  const accent = side === 'offense' ? team.colors.accent : team.colors.secondary;
  return (
    <section className={`tv-eroster__side tv-eroster__side--${side}`} style={{ '--accent': accent } as CSSProperties}>
      <header>
        <span>{side === 'offense' ? 'Offense' : 'Defense'}</span>
        <b>{team.name}</b>
        <em>{players.length}</em>
      </header>
      {players.length ? (
        <ul>
          {players.map((p, i) => {
            const e = eliteOf(p)!;
            return (
              <li key={p.id} style={{ '--i': i } as CSSProperties} title={`Platz ${e.rank} der ${e.group}`}>
                <EliteCrest className="tv-eroster__crest" />
                <span className="tv-eroster__who">
                  <b>
                    {p.player?.number != null && <i>{p.player.number}</i>}
                    {p.shortName}
                  </b>
                  <small>#{e.rank} {e.title}</small>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>Kein Elite-Spieler in der Startformation</p>
      )}
    </section>
  );
}

/**
 * „Elite on the Field“: alle Elite-Spieler beider Startformationen auf einen Blick (Einstieg und Final Shot).
 * Wer und wie viele, folgt allein aus dem Elite-Status der Daten – ohne Elite-Spieler bleibt die Seite leer.
 */
export function EliteRoster({ model }: { model: SceneModel }) {
  return (
    <div className="tv-eroster" role="group" aria-label="Elite-Spieler auf dem Feld">
      <div className="tv-eroster__title">
        <EliteCrest className="tv-eroster__crest tv-eroster__crest--lg" />
        <span>
          <b>Elite on the Field</b>
          <small>Top 10 ihrer Positionsgruppe · Saison {model.season.season}</small>
        </span>
      </div>
      <div className="tv-eroster__cols">
        <RosterSide team={model.offense} side="offense" players={model.elite.offense} />
        <RosterSide team={model.defense} side="defense" players={model.elite.defense} />
      </div>
    </div>
  );
}

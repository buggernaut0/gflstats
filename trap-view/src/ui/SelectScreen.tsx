import type { CSSProperties } from 'react';
import type { Team } from '../data/types';

interface Props {
  teams: Team[];
  seasons: number[];
  season: number;
  offenseId: string;
  defenseId: string;
  leaving: boolean;
  loading: boolean;
  onSeason: (season: number) => void;
  onChange: (offenseId: string, defenseId: string) => void;
  onEnter: () => void;
}

function Side(props: {
  role: 'OFFENSE' | 'DEFENSE';
  teams: Team[];
  selected: Team;
  blockedId: string;
  onPick: (id: string) => void;
}) {
  const { role, teams, selected, blockedId, onPick } = props;
  const style = {
    '--team': selected.colors.primary,
    '--team-accent': selected.colors.accent,
  } as CSSProperties;
  const lu = selected.lineup;
  return (
    <section className={`tv-side tv-side--${role.toLowerCase()}`} style={style}>
      <div className="tv-side__glow" />
      <div className="tv-side__inner">
        <div className="tv-side__role">{role}</div>
        {selected.logo && <img className="tv-side__logo" src={selected.logo} alt="" key={`${selected.id}-l`} />}
        <div className="tv-side__city" key={selected.id}>{selected.city}</div>
        <div className="tv-side__nick" key={`${selected.id}-n`}>{selected.nickname}</div>
        <div className="tv-side__swatches" title={selected.colorsVerified ? `Teamfarben: ${selected.colorSource}` : 'Keine belegten Teamfarben – neutrale Platzhalter'}>
          <i style={{ background: selected.colors.primary }} />
          <i style={{ background: selected.colors.secondary }} />
          {!selected.colorsVerified && <span>Farben nicht belegt</span>}
        </div>
        <div className="tv-side__basis">
          {lu.basis === 'roster'
            ? <>Offizieller Kader · Nummern &amp; Positionen</>
            : <>Vorläufig · aus Statistik, ohne Nummern</>}
          <span> · {lu.teamGames} Spiele</span>
        </div>
        <div className="tv-side__teams">
          {teams.map((t) => (
            <button
              key={t.id}
              className={`tv-chip${t.id === selected.id ? ' is-active' : ''}`}
              disabled={t.id === blockedId}
              onClick={() => onPick(t.id)}
              title={t.name}
            >
              {t.abbreviation}
              <span>{t.nickname}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Stille Auswahloberfläche: Saison oben, Offense links, Defense rechts, ein Button in der Mitte. */
export function SelectScreen({ teams, seasons, season, offenseId, defenseId, leaving, loading, onSeason, onChange, onEnter }: Props) {
  const offense = teams.find((t) => t.id === offenseId) ?? teams[0];
  const defense = teams.find((t) => t.id === defenseId && t.id !== offense.id) ?? teams.find((t) => t.id !== offense.id) ?? teams[0];
  return (
    <div className={`tv-select${leaving ? ' is-leaving' : ''}${loading ? ' is-loading' : ''}`}>
      <header className="tv-select__head">
        <span className="tv-wordmark">TRAP VIEW</span>
        <div className="tv-seasons" role="group" aria-label="Saison">
          {seasons.map((s) => (
            <button key={s} className={`tv-season${s === season ? ' is-active' : ''}`} onClick={() => onSeason(s)} aria-pressed={s === season}>
              {s}
            </button>
          ))}
        </div>
        <span className="tv-select__sub">GFL Analytics · Starting Lineups {season}</span>
      </header>
      <div className="tv-select__sides">
        <Side role="OFFENSE" teams={teams} selected={offense} blockedId={defense.id} onPick={(id) => onChange(id, defense.id)} />
        <div className="tv-select__vs"><span>VS</span></div>
        <Side role="DEFENSE" teams={teams} selected={defense} blockedId={offense.id} onPick={(id) => onChange(offense.id, id)} />
      </div>
      <footer className="tv-select__foot">
        <button className="tv-enter" onClick={onEnter} disabled={loading}>
          <span>ENTER TRAP VIEW</span>
        </button>
        <span className="tv-select__hint">Sound on · the beat starts when you enter</span>
      </footer>
    </div>
  );
}

import type { CSSProperties } from 'react';
import type { Team } from '../data/types';

interface Props {
  teams: Team[];
  offenseId: string;
  defenseId: string;
  leaving: boolean;
  isSampleData: boolean;
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
  return (
    <section className={`tv-side tv-side--${role.toLowerCase()}`} style={style}>
      <div className="tv-side__glow" />
      <div className="tv-side__inner">
        <div className="tv-side__role">{role}</div>
        <div className="tv-side__city" key={selected.id}>{selected.city}</div>
        <div className="tv-side__nick" key={`${selected.id}-n`}>{selected.nickname}</div>
        <div className="tv-side__swatches">
          <i style={{ background: selected.colors.primary }} />
          <i style={{ background: selected.colors.secondary }} />
        </div>
        <div className="tv-side__teams">
          {teams.map((t) => (
            <button
              key={t.id}
              className={`tv-chip${t.id === selected.id ? ' is-active' : ''}`}
              disabled={t.id === blockedId}
              onClick={() => onPick(t.id)}
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

/** Stille Auswahloberfläche: Offense links, Defense rechts, ein Button in der Mitte. */
export function SelectScreen({ teams, offenseId, defenseId, leaving, isSampleData, onChange, onEnter }: Props) {
  const offense = teams.find((t) => t.id === offenseId) ?? teams[0];
  const defense = teams.find((t) => t.id === defenseId) ?? teams[1];
  return (
    <div className={`tv-select${leaving ? ' is-leaving' : ''}`}>
      <header className="tv-select__head">
        <span className="tv-wordmark">TRAP VIEW</span>
        <span className="tv-select__sub">GFL Analytics · Prototype{isSampleData ? ' · Sample Data' : ''}</span>
      </header>
      <div className="tv-select__sides">
        <Side role="OFFENSE" teams={teams} selected={offense} blockedId={defense.id} onPick={(id) => onChange(id, defense.id)} />
        <div className="tv-select__vs"><span>VS</span></div>
        <Side role="DEFENSE" teams={teams} selected={defense} blockedId={offense.id} onPick={(id) => onChange(offense.id, id)} />
      </div>
      <footer className="tv-select__foot">
        <button className="tv-enter" onClick={onEnter}>
          <span>ENTER TRAP VIEW</span>
        </button>
        <span className="tv-select__hint">Sound on · the beat starts when you enter</span>
      </footer>
    </div>
  );
}

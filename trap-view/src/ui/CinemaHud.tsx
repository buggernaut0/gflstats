import { useEffect, useState } from 'react';
import { playerTag, type SceneModel } from '../data/sceneModel';
import type { DataIndex } from '../data/types';
import { MatchupPanel } from '../matchup/MatchupPanel';
import { useTrapView } from '../state/store';

/** Zurückhaltende Bedienelemente über der Szene; blenden sich bei Inaktivität aus. */
export function CinemaHud({ model, index, noAudio, onExit }: {
  model: SceneModel;
  index: DataIndex;
  noAudio: boolean;
  onExit: () => void;
}) {
  const chapter = useTrapView((s) => s.chapter);
  const matchupId = useTrapView((s) => s.matchupId);
  const ended = useTrapView((s) => s.ended);
  const volume = useTrapView((s) => s.volume);
  const muted = useTrapView((s) => s.muted);
  const restartToken = useTrapView((s) => s.restartToken);
  const { setMatchup, setVolume, toggleMuted, restart } = useTrapView.getState();

  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), 3500);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), 3500);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  const active = model.matchups.find((m) => m.id === matchupId);
  const quiet = idle && !active && !ended;
  const provisional = [model.offense, model.defense].some((t) => t.lineup.basis === 'provisional');

  return (
    <div className={`tv-hud${quiet ? ' is-quiet' : ''}`}>
      <div className="tv-bars" />

      <div className="tv-title" key={restartToken}>
        <span style={{ color: model.offense.colors.accent }}>{model.offense.name}</span>
        <em>vs</em>
        <span>{model.defense.name}</span>
      </div>

      <div className="tv-hud__top tv-fade">
        <span className="tv-wordmark tv-wordmark--sm">TRAP VIEW</span>
        <span className="tv-tag">Saison {model.season.season}</span>
        {provisional && <span className="tv-tag" title="Ohne offiziellen Kader: keine Rückennummern, Positionen nur grob aus der Statistik">Vorläufige Aufstellung</span>}
      </div>

      {chapter && !active && (
        <div className="tv-chapter" key={`${restartToken}-${chapter.index}`}>
          <span className="tv-chapter__idx">{String(chapter.index + 1).padStart(2, '0')}</span>
          <span className="tv-chapter__text">
            <b>{chapter.title}</b>
            <small>{chapter.subtitle}</small>
          </span>
        </div>
      )}

      {model.matchups.length > 0 && (
        <nav className="tv-matchups tv-fade">
          <span className="tv-matchups__head">Matchups</span>
          {model.matchups.map((m) => (
            <button
              key={m.id}
              className={`tv-matchup${m.id === matchupId ? ' is-active' : ''}`}
              onClick={() => setMatchup(m.id === matchupId ? null : m.id)}
            >
              <b>{playerTag(m.offense, m.offense.player?.number == null)}</b>
              <i>vs</i>
              <b>{playerTag(m.defense, m.defense.player?.number == null)}</b>
            </button>
          ))}
        </nav>
      )}

      {active && <MatchupPanel matchup={active} index={index} season={model.season} onClose={() => setMatchup(null)} />}

      <div className="tv-controls tv-fade">
        {noAudio && <span className="tv-tag" title="public/audio/track.mp3 fehlt">No audio</span>}
        <button className="tv-btn" onClick={restart}>{ended ? 'Replay' : 'Restart'}</button>
        <button className="tv-btn" onClick={toggleMuted}>{muted ? 'Unmute' : 'Mute'}</button>
        <input
          className="tv-volume"
          type="range" min={0} max={1} step={0.01}
          value={volume}
          aria-label="Volume"
          onChange={(e) => setVolume(Number(e.target.value))}
        />
        <button className="tv-btn" onClick={onExit}>Exit</button>
      </div>
    </div>
  );
}

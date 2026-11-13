import { useEffect, useState } from 'react';
import { playerTag, type SceneModel } from '../data/sceneModel';
import type { DataIndex } from '../data/types';
import { MatchupPanel } from '../matchup/MatchupPanel';
import { useTrapView } from '../state/store';
import type { AudioStatus } from '../audio/AudioEngine';

/** Zurückhaltende Bedienelemente über der Szene; blenden sich bei Inaktivität aus. */
export function CinemaHud({ model, index, audioStatus, onUnlockAudio, onExit }: {
  model: SceneModel;
  index: DataIndex;
  audioStatus: AudioStatus;
  /** Musik starten, nachdem der Browser die automatische Wiedergabe blockiert hat. */
  onUnlockAudio: () => void;
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
    // pointerdown/focusin: auf Touch-Geräten und bei Tastaturbedienung gibt es kein pointermove
    const events = ['pointermove', 'pointerdown', 'keydown', 'focusin'] as const;
    events.forEach((e) => window.addEventListener(e, wake));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, []);

  // Escape: erst das Duell schließen, dann die Präsentation verlassen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useTrapView.getState().matchupId) setMatchup(null);
      else onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit, setMatchup]);

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
        <nav className="tv-matchups tv-fade" aria-label="Matchups">
          <span className="tv-matchups__head">Matchups</span>
          {model.matchups.map((m) => (
            <button
              key={m.id}
              className={`tv-matchup${m.id === matchupId ? ' is-active' : ''}`}
              aria-pressed={m.id === matchupId}
              onClick={() => setMatchup(m.id === matchupId ? null : m.id)}
            >
              <b>{playerTag(m.offense, m.offense.player?.number == null)}</b>
              <i>vs</i>
              <b>{playerTag(m.defense, m.defense.player?.number == null)}</b>
            </button>
          ))}
        </nav>
      )}

      {active && <MatchupPanel model={model} matchup={active} index={index} season={model.season} onClose={() => setMatchup(null)} />}

      <div className="tv-controls tv-fade">
        {audioStatus === 'missing' && <span className="tv-tag" title="Musikdatei fehlt oder ist nicht abspielbar">No audio</span>}
        {audioStatus === 'blocked' && <button className="tv-btn tv-btn--call" onClick={onUnlockAudio}>Sound on</button>}
        <button className="tv-btn" onClick={restart}>{ended ? 'Replay' : 'Restart'}</button>
        <button className="tv-btn" onClick={toggleMuted} aria-pressed={muted}>{muted ? 'Unmute' : 'Mute'}</button>
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

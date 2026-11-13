import { useEffect, useMemo, useRef, useState } from 'react';
import type { TrapViewData } from './data/types';
import { buildSceneModel } from './data/sceneModel';
import { AudioEngine } from './audio/AudioEngine';
import { Scene } from './scene/Scene';
import { SelectScreen } from './ui/SelectScreen';
import { CinemaHud } from './ui/CinemaHud';
import { LabelLayer, type LabelRegistry } from './labels/PlayerLabels';
import { useTrapView } from './state/store';
import './ui/styles.css';

export interface TrapViewProps {
  /** GFL-Daten: Index (Methodik, Feldnamen) und die gewählte Saison mit Teams und Lineups. */
  data: TrapViewData;
  /** true, solange eine andere Saison geladen wird. */
  loading?: boolean;
  /** Saisonwechsel in der Auswahl. Ohne Handler wird keine Saisonauswahl angeboten. */
  onSeasonChange?: (season: number) => void;
  /** Musikdatei (Standard: public/audio/track.mp3). Fehlt sie, bleibt es still. */
  audioSrc?: string;
  /** Wird aufgerufen, wenn der Nutzer den Kinomodus verlässt. */
  onExit?: () => void;
}

/** Zeit, in der die Auswahl ausblendet und die Szene im Dunkeln vorbereitet wird. */
const ENTER_MS = 1500;

/** Öffentlicher Einstiegspunkt des Features – füllt seinen Container vollständig. */
export function TrapView({ data, loading = false, onSeasonChange, audioSrc = `${import.meta.env.BASE_URL}audio/track.mp3`, onExit }: TrapViewProps) {
  const { index, season } = data;
  const phase = useTrapView((s) => s.phase);
  const storedOffense = useTrapView((s) => s.offenseId);
  const storedDefense = useTrapView((s) => s.defenseId);
  // Nach einem Saisonwechsel nur Teams verwenden, die es in dieser Saison gibt
  const has = (id: string) => season.teams.some((t) => t.id === id);
  const offenseId = has(storedOffense) ? storedOffense : season.teams[0].id;
  const defenseId = has(storedDefense) && storedDefense !== offenseId ? storedDefense : season.teams.find((t) => t.id !== offenseId)!.id;
  const volume = useTrapView((s) => s.volume);
  const muted = useTrapView((s) => s.muted);
  const restartToken = useTrapView((s) => s.restartToken);

  const audio = useRef<AudioEngine | null>(null);
  audio.current ??= new AudioEngine();
  const fadeRef = useRef<HTMLDivElement>(null);
  const labels = useRef<LabelRegistry>(new Map());
  const [fontsReady, setFontsReady] = useState(false);
  const [noAudio, setNoAudio] = useState(false);

  // Trikotnummern und Feldzahlen werden auf Canvas gezeichnet – Schriften müssen vorher geladen sein
  useEffect(() => {
    Promise.all([
      document.fonts.load('64px Anton'),
      document.fonts.load('600 30px "Barlow Condensed"'),
    ]).finally(() => setFontsReady(true));
  }, []);

  const model = useMemo(() => buildSceneModel(season, offenseId, defenseId), [season, offenseId, defenseId]);

  useEffect(() => audio.current!.setVolume(volume), [volume]);
  useEffect(() => audio.current!.setMuted(muted), [muted]);
  useEffect(() => () => audio.current?.stop(), []);

  const startAudio = () => {
    void audio.current!.start(audioSrc).then(() => setNoAudio(!audio.current!.available));
  };

  // Neustart über die HUD: Musik beginnt mit der Kamera von vorn
  const firstToken = useRef(restartToken);
  useEffect(() => {
    if (restartToken === firstToken.current) return;
    if (useTrapView.getState().phase === 'cinema') startAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartToken]);

  useEffect(() => {
    if (phase !== 'entering') return;
    const t = window.setTimeout(() => useTrapView.getState().setPhase('cinema'), ENTER_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  const enter = () => {
    const s = useTrapView.getState();
    s.setTeams(offenseId, defenseId);
    firstToken.current = s.restartToken + 1;
    s.restart();
    s.setPhase('entering');
    startAudio();
  };

  const exit = () => {
    audio.current!.stop();
    useTrapView.getState().exit();
    onExit?.();
  };

  const inCinema = phase !== 'select';

  return (
    <div className="tv-root">
      {inCinema && fontsReady && (
        <div className="tv-stage">
          <Scene model={model} fadeRef={fadeRef} labels={labels} />
          <LabelLayer model={model} registry={labels.current} />
          <div ref={fadeRef} className="tv-dip" />
          {phase === 'cinema' && <CinemaHud model={model} index={index} noAudio={noAudio} onExit={exit} />}
        </div>
      )}
      <div className={`tv-curtain${phase === 'cinema' ? ' is-open' : ''}`} />
      {phase !== 'cinema' && (
        <SelectScreen
          teams={season.teams}
          seasons={onSeasonChange ? index.seasons.map((s) => s.season) : [season.season]}
          season={season.season}
          offenseId={offenseId}
          defenseId={defenseId}
          leaving={phase === 'entering'}
          loading={loading}
          onSeason={(s) => onSeasonChange?.(s)}
          onChange={(o, d) => useTrapView.getState().setTeams(o, d)}
          onEnter={enter}
        />
      )}
    </div>
  );
}

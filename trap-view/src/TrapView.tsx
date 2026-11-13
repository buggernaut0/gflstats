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
  /** Teams, Formation und Matchups. Im Prototyp: Beispieldaten. */
  data: TrapViewData;
  /** Austauschbare Musikdatei. Fehlt sie, läuft ein synthetischer Platzhalter. */
  audioSrc?: string;
  /** Wird aufgerufen, wenn der Nutzer den Kinomodus verlässt. */
  onExit?: () => void;
}

/** Zeit, in der die Auswahl ausblendet und die Szene im Dunkeln vorbereitet wird. */
const ENTER_MS = 1500;

/** Öffentlicher Einstiegspunkt des Features – füllt seinen Container vollständig. */
export function TrapView({ data, audioSrc = '/audio/track.mp3', onExit }: TrapViewProps) {
  const phase = useTrapView((s) => s.phase);
  const offenseId = useTrapView((s) => s.offenseId) || data.teams[0].id;
  const defenseId = useTrapView((s) => s.defenseId) || data.teams[1].id;
  const volume = useTrapView((s) => s.volume);
  const muted = useTrapView((s) => s.muted);
  const restartToken = useTrapView((s) => s.restartToken);

  const audio = useRef<AudioEngine | null>(null);
  audio.current ??= new AudioEngine();
  const fadeRef = useRef<HTMLDivElement>(null);
  const labels = useRef<LabelRegistry>(new Map());
  const [fontsReady, setFontsReady] = useState(false);
  const [placeholder, setPlaceholder] = useState(false);

  // Trikotnummern und Feldzahlen werden auf Canvas gezeichnet – Schriften müssen vorher geladen sein
  useEffect(() => {
    Promise.all([
      document.fonts.load('64px Anton'),
      document.fonts.load('600 30px "Barlow Condensed"'),
    ]).finally(() => setFontsReady(true));
  }, []);

  const model = useMemo(() => buildSceneModel(data, offenseId, defenseId), [data, offenseId, defenseId]);

  useEffect(() => audio.current!.setVolume(volume), [volume]);
  useEffect(() => audio.current!.setMuted(muted), [muted]);
  useEffect(() => () => audio.current?.stop(), []);

  const startAudio = () => {
    void audio.current!.start(audioSrc).then(() => setPlaceholder(audio.current!.usingPlaceholder));
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
          {phase === 'cinema' && <CinemaHud model={model} usingPlaceholder={placeholder} onExit={exit} />}
        </div>
      )}
      <div className={`tv-curtain${phase === 'cinema' ? ' is-open' : ''}`} />
      {phase !== 'cinema' && (
        <SelectScreen
          teams={data.teams}
          offenseId={offenseId}
          defenseId={defenseId}
          leaving={phase === 'entering'}
          isSampleData={data.isSampleData}
          onChange={(o, d) => useTrapView.getState().setTeams(o, d)}
          onEnter={enter}
        />
      )}
    </div>
  );
}

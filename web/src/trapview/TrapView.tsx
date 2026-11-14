import { useEffect, useMemo, useRef, useState } from 'react';
import type { TrapViewData } from './data/types';
import { buildSceneModel } from './data/sceneModel';
import { AudioEngine, type AudioStatus } from './audio/AudioEngine';
import { Scene } from './scene/Scene';
import { webglAvailable } from './scene/quality';
import { SelectScreen } from './ui/SelectScreen';
import { CinemaHud } from './ui/CinemaHud';
import { LineupBoard } from './ui/LineupBoard';
import { LabelLayer, type LabelRegistry } from './labels/PlayerLabels';
import { useTrapView } from './state/store';
import { ASSET_BASE } from './paths';
import './ui/styles.css';

export interface TrapViewProps {
  /** GFL-Daten: Index (Methodik, Feldnamen) und die gewählte Saison mit Teams und Lineups. */
  data: TrapViewData;
  /** true, solange eine andere Saison geladen wird. */
  loading?: boolean;
  /** Saisonwechsel in der Auswahl. Ohne Handler wird keine Saisonauswahl angeboten. */
  onSeasonChange?: (season: number) => void;
  /** Musik: eine Datei oder mehrere (zufällige Auswahl je Eintritt). Standard: TRACKS. Fehlt sie, bleibt es still. */
  audioSrc?: string | string[];
  /** Wird aufgerufen, wenn der Nutzer den Kinomodus verlässt. */
  onExit?: () => void;
  /** Öffnet den Simulator (nur Saison 2026) mit den gewählten Teams. */
  onSimulate?: (teamA: string, teamB: string, autoStart?: boolean) => void;
  /** true, während der Übergang in den Simulator läuft (Kamera fährt ins Bild, Szene blendet ab). */
  leaving?: boolean;
}

/** Ausblenden der Musik beim Wechsel in den Simulator – so lang wie der ganze Übergang, kein Schnitt. */
export const HANDOFF_AUDIO_FADE = 2.2;

/** Lieder der Trap View (public/trapview/audio/). Bei jedem „Enter Trap View“ wird eines zufällig gewählt. */
export const TRACKS = ['track.mp3', 'track-2.mp3', 'track-3.mp3', 'track-4.mp3'].map((f) => `${ASSET_BASE}/audio/${f}`);

/** Zufälliges Lied, möglichst nicht dasselbe wie zuletzt. */
function pickTrack(list: string[], last: string | null): string {
  const pool = list.length > 1 ? list.filter((t) => t !== last) : list;
  return pool[Math.floor(Math.random() * pool.length)] ?? list[0];
}

/** Zeit, in der die Auswahl ausblendet und die Szene im Dunkeln vorbereitet wird. */
const ENTER_MS = 1500;

/** Zustand der 3D-Darstellung: läuft, nicht verfügbar, beim Aufbau gescheitert oder vom Browser beendet. */
type Stage = 'ok' | 'unsupported' | 'error' | 'lost';

/** Öffentlicher Einstiegspunkt des Features – füllt seinen Container vollständig. */
export function TrapView({ data, loading = false, onSeasonChange, audioSrc = TRACKS, onExit, onSimulate, leaving = false }: TrapViewProps) {
  const { index, season } = data;
  const phase = useTrapView((s) => s.phase);
  const storedOffense = useTrapView((s) => s.offenseId);
  const storedDefense = useTrapView((s) => s.defenseId);
  // Nach einem Saisonwechsel nur Teams verwenden, die es in dieser Saison gibt
  const has = (id: string) => season.teams.some((t) => t.id === id);
  const offenseId = has(storedOffense) ? storedOffense : season.teams[0]?.id ?? '';
  const defenseId = has(storedDefense) && storedDefense !== offenseId ? storedDefense : season.teams.find((t) => t.id !== offenseId)?.id ?? '';
  const playable = season.teams.length >= 2;
  const volume = useTrapView((s) => s.volume);
  const muted = useTrapView((s) => s.muted);
  const restartToken = useTrapView((s) => s.restartToken);

  const tracks = typeof audioSrc === 'string' ? [audioSrc] : audioSrc;
  /** Lied des aktuellen Durchgangs – ein Neustart über die HUD behält es bei */
  const track = useRef<string | null>(null);
  const audio = useRef<AudioEngine | null>(null);
  audio.current ??= new AudioEngine();
  const fadeRef = useRef<HTMLDivElement>(null);
  const labels = useRef<LabelRegistry>(new Map());
  const [fontsReady, setFontsReady] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [stage, setStage] = useState<Stage>(() => (webglAvailable() ? 'ok' : 'unsupported'));
  /** Erhöht sich, wenn die 3D-Szene nach einem Ausfall neu aufgebaut werden soll. */
  const [sceneKey, setSceneKey] = useState(0);

  // Trikotnummern und Feldzahlen werden auf Canvas gezeichnet – Schriften müssen vorher geladen sein
  useEffect(() => {
    let alive = true;
    Promise.all([
      document.fonts.load('64px Anton'),
      document.fonts.load('600 30px "Barlow Condensed"'),
    ]).finally(() => alive && setFontsReady(true));
    return () => { alive = false; };
  }, []);

  const model = useMemo(
    () => (playable ? buildSceneModel(season, offenseId, defenseId) : null),
    [playable, season, offenseId, defenseId],
  );

  useEffect(() => audio.current!.setVolume(volume), [volume]);
  useEffect(() => audio.current!.setMuted(muted), [muted]);

  // Aufräumen beim Verlassen der Ansicht (auch wenn die Seite mitten in der Präsentation wechselt):
  // Musik und AudioContext freigeben, Zustand zurück auf die Auswahl. Canvas, Geometrien und Texturen
  // gibt die Szene selbst frei, sobald sie ausgehängt wird.
  useEffect(() => {
    const engine = audio.current!;
    engine.onStatus = setAudioStatus;
    const onVisibility = () => engine.setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      engine.onStatus = null;
      // Musik nicht abschneiden: laufende Ausblendung zu Ende führen, dann freigeben
      engine.release();
      useTrapView.getState().exit();
    };
  }, []);

  // Neustart über die HUD: Musik beginnt mit der Kamera von vorn (der Klick auf „Restart“ ist die Nutzeraktion)
  const firstToken = useRef(restartToken);
  useEffect(() => {
    if (restartToken === firstToken.current) return;
    if (useTrapView.getState().phase === 'cinema') audio.current!.start(track.current ?? pickTrack(tracks, null));
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
    // Nach einem früheren Ausfall der 3D-Szene bei jedem Eintritt neu versuchen
    if (stage !== 'ok') retry3d();
    // Direkt im Klick starten – nur so erlauben Browser die Wiedergabe. Jeder Eintritt: zufälliges Lied
    track.current = pickTrack(tracks, track.current);
    audio.current!.start(track.current);
  };

  const retry3d = () => {
    setStage(webglAvailable() ? 'ok' : 'unsupported');
    setSceneKey((k) => k + 1);
  };

  const exit = () => {
    audio.current!.stop();
    useTrapView.getState().exit();
    onExit?.();
  };

  // Fällt die 3D-Szene aus, verschwinden auch ihre Einblendungen (Kapitel, Labels)
  const failStage = (reason: 'error' | 'lost') => {
    setStage(reason);
    const s = useTrapView.getState();
    s.setChapter(null);
    s.setSpotlight(null);
    s.setVisibleLabels([]);
  };

  if (!model) {
    return (
      <div className="tv-root">
        <div className="tv-boot"><b>Für diese Saison liegen keine zwei Teams vor.</b></div>
      </div>
    );
  }

  const inCinema = phase !== 'select';

  return (
    <div className={`tv-root${leaving ? ' is-leaving' : ''}`}>
      {inCinema && fontsReady && (
        <div className={`tv-stage${stage === 'ok' ? '' : ' tv-stage--plain'}`}>
          {stage === 'ok' ? (
            <>
              <Scene key={sceneKey} model={model} fadeRef={fadeRef} labels={labels} onFail={failStage} />
              <LabelLayer model={model} registry={labels.current} />
              <LineupBoard model={model} srOnly />
              <div ref={fadeRef} className="tv-dip" />
            </>
          ) : (
            <LineupBoard
              model={model}
              notice={
                stage === 'unsupported' ? (
                  <>Die 3D-Ansicht braucht WebGL 2, das dieser Browser oder dieses Gerät nicht bereitstellt. Aufstellung und Duelle stehen hier als Übersicht.</>
                ) : (
                  <>
                    {stage === 'lost' ? 'Der Browser hat die 3D-Ansicht beendet (Grafikspeicher).' : 'Die 3D-Ansicht konnte nicht aufgebaut werden.'}{' '}
                    <button className="tv-btn" onClick={retry3d}>3D neu laden</button>
                  </>
                )
              }
            />
          )}
          {phase === 'cinema' && (
            <CinemaHud
              model={model}
              index={index}
              audioStatus={audioStatus}
              onUnlockAudio={() => audio.current!.unlock()}
              onExit={exit}
              onSimulate={
                onSimulate
                  ? season.season === 2026
                    ? () => {
                      // Musik weich über den ganzen Übergang ausblenden; die Szene gibt Canvas und Speicher
                      // beim Aushängen selbst frei
                      audio.current!.stop(HANDOFF_AUDIO_FADE);
                      onSimulate(model.offense.id, model.defense.id, true);
                    }
                    : null
                  : undefined
              }
            />
          )}
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
          onSimulate={onSimulate && season.season === 2026 ? () => onSimulate(offenseId, defenseId) : undefined}
        />
      )}
    </div>
  );
}

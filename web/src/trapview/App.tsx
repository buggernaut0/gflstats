'use client';

import '@fontsource/anton';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import { useEffect, useRef, useState } from 'react';
import { TrapView } from './TrapView';
import { SimulatorView, SIM_SEASON, preloadSimulator } from './simview/SimulatorView';
import { loadIndex, loadSeason } from './data/load';
import type { DataIndex, SeasonData } from './data/types';
import './ui/styles.css';

const SIM_HASH = '#simulator';
const isSimHash = () => window.location.hash.startsWith(SIM_HASH);

/**
 * Übergang Trap View → Simulator (in ms). Ablauf:
 *   out  – die Kamera fährt in die Szene, das Bild wird weich und blendet nach Schwarz; die Musik blendet
 *          über den ganzen Übergang aus (TrapView: HANDOFF_AUDIO_FADE), nichts wird abgeschnitten
 *   card – Titelkarte „GFL SIMULATOR – Team vs Team“; dahinter wird der Simulator aufgebaut (Daten sind
 *          vorab geladen, siehe preloadSimulator) und das erste Bild steht still
 *   in   – die Karte blendet auf, der Kickoff beginnt erst danach
 * Zusammen gut 2 s: wahrnehmbar inszeniert, aber ohne Wartegefühl. Zurück zur Trap View: kurze Blende.
 */
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const timingFor = (toSim: boolean) =>
  reduced()
    ? { out: 150, card: toSim ? 500 : 0, in: 150 }
    : toSim
      ? { out: 750, card: 950, in: 650 }
      : { out: 350, card: 0, in: 450 };

interface Handoff {
  stage: 'out' | 'card' | 'in';
  toSim: boolean;
  t: { out: number; card: number; in: number };
  teams?: [string, string];
  autoStart?: boolean;
}

/**
 * Hülle der Trap View in GFL Analytics (Seite /trap-view/): lädt die aus den Website-Daten exportierten
 * Dateien (public/trapview/data, erzeugt von `npm run data:trapview`) und reicht sie an <TrapView /> weiter.
 * `#simulator` öffnet den Spielsimulator (Saison 2026) – er ist Teil der Trap View, keine eigene Seite.
 * Füllt seinen Container vollständig.
 */
export function App() {
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<{ teams?: [string, string]; autoStart?: boolean } | null>(() => (isSimHash() ? {} : null));
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const onHash = () => setSim((s) => (isSimHash() ? s ?? {} : null));
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const pickSeason = (year: number) => {
    setLoading(true);
    loadSeason(year)
      .then(setSeason)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIndex()
      .then((ix) => {
        setIndex(ix);
        pickSeason(ix.currentSeason);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  // Simulator-Daten im Hintergrund vorladen, sobald die Saison 2026 gezeigt wird – der Wechsel kommt dann ohne Ladepause
  const simSeasonShown = season?.season === SIM_SEASON;
  useEffect(() => {
    if (!simSeasonShown) return;
    const t = window.setTimeout(() => { preloadSimulator().catch(() => undefined); }, 2000);
    return () => window.clearTimeout(t);
  }, [simSeasonShown]);

  /** Startet einen Übergang; `swap` wird ausgeführt, wenn das Bild schwarz ist. */
  const runHandoff = (h: Omit<Handoff, 'stage' | 't'>, swap: () => void) => {
    if (handoff) return; // Doppelklick während des Übergangs
    const t = timingFor(h.toSim);
    setHandoff({ ...h, t, stage: 'out' });
    const at = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));
    at(t.out, () => {
      swap();
      setHandoff((x) => x && { ...x, stage: t.card ? 'card' : 'in' });
    });
    if (t.card) at(t.out + t.card, () => setHandoff((x) => x && { ...x, stage: 'in' }));
    at(t.out + t.card + t.in, () => {
      setHandoff(null);
      timers.current = [];
    });
  };

  /** autoStart: aus der laufenden Trap View → ohne Teamauswahl direkt simulieren */
  const openSim = (a: string, b: string, autoStart = false) => {
    preloadSimulator().catch(() => undefined);
    runHandoff({ toSim: true, teams: [a, b], autoStart }, () => {
      setSim({ teams: [a, b], autoStart });
      window.history.pushState(null, '', SIM_HASH);
    });
  };
  const closeSim = () => {
    runHandoff({ toSim: false }, () => {
      setSim(null);
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    });
  };

  const teamName = (id: string) => season?.teams.find((t) => t.id === id)?.name ?? id;
  const leaving = !!handoff && handoff.toSim && handoff.stage === 'out';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {sim ? (
        <SimulatorView
          initialTeams={sim.teams}
          autoStart={sim.autoStart}
          onBack={closeSim}
          startDelayMs={handoff ? handoff.t.card + handoff.t.in * 0.6 : 0}
        />
      ) : error ? (
        <div className="tv-boot">
          <b>Daten konnten nicht geladen werden.</b>
          <span>{error}</span>
          <span>Im Ordner web <code>npm run data</code> ausführen.</span>
        </div>
      ) : index && season ? (
        <TrapView data={{ index, season }} loading={loading} onSeasonChange={pickSeason} onSimulate={openSim} leaving={leaving} />
      ) : (
        <div className="tv-boot"><span>Lade GFL-Daten …</span></div>
      )}
      {handoff && (
        <div
          className={`tv-handoff tv-handoff--${handoff.stage}`}
          style={{ '--ho-out': `${handoff.t.out}ms`, '--ho-in': `${handoff.t.in}ms` } as React.CSSProperties}
          aria-hidden="true"
        >
          {handoff.toSim && handoff.teams && (
            <div className="tv-handoff__card">
              <span className="tv-handoff__brand">GFL Simulator</span>
              <span className="tv-handoff__teams">
                {teamName(handoff.teams[0])}<i>vs</i>{teamName(handoff.teams[1])}
              </span>
              <span className="tv-handoff__bar" />
              <span className="tv-handoff__sub">Saison {SIM_SEASON} · {handoff.autoStart ? 'Kickoff' : 'Teamauswahl'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

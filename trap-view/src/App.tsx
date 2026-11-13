import { useEffect, useState } from 'react';
import { TrapView } from './TrapView';
import { SimulatorView } from './simview/SimulatorView';
import { loadIndex, loadSeason } from './data/load';
import type { DataIndex, SeasonData } from './data/types';
import './ui/styles.css';

const SIM_HASH = '#simulator';
const isSimHash = () => window.location.hash.startsWith(SIM_HASH);

/**
 * Demo-Hülle: lädt die aus der GFL-Datenbank exportierten Daten (public/data, erzeugt von
 * `npm run data`) und reicht sie an <TrapView /> weiter. In GFL Analytics kann <TrapView /> mit
 * denselben Daten direkt eingebunden werden. `#simulator` öffnet den Spielsimulator (Saison 2026).
 */
export function App() {
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<{ teams?: [string, string]; autoStart?: boolean } | null>(() => (isSimHash() ? {} : null));

  useEffect(() => {
    const onHash = () => setSim((s) => (isSimHash() ? s ?? {} : null));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
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

  /** autoStart: aus der laufenden Trap View → ohne Teamauswahl direkt simulieren */
  const openSim = (a: string, b: string, autoStart = false) => {
    setSim({ teams: [a, b], autoStart });
    window.history.pushState(null, '', SIM_HASH);
  };
  const closeSim = () => {
    setSim(null);
    window.history.pushState(null, '', window.location.pathname + window.location.search);
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {sim ? (
        <SimulatorView initialTeams={sim.teams} autoStart={sim.autoStart} onBack={closeSim} />
      ) : error ? (
        <div className="tv-boot">
          <b>Daten konnten nicht geladen werden.</b>
          <span>{error}</span>
          <span>Erst im Repo-Hauptordner <code>python scripts/build_data.py</code>, dann hier <code>npm run data</code> ausführen.</span>
        </div>
      ) : index && season ? (
        <TrapView data={{ index, season }} loading={loading} onSeasonChange={pickSeason} onSimulate={openSim} />
      ) : (
        <div className="tv-boot"><span>Lade GFL-Daten …</span></div>
      )}
    </div>
  );
}

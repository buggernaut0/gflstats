import { useEffect, useState } from 'react';
import { TrapView } from './TrapView';
import { loadIndex, loadSeason } from './data/load';
import type { DataIndex, SeasonData } from './data/types';
import './ui/styles.css';

/**
 * Demo-Hülle: lädt die aus der GFL-Datenbank exportierten Daten (public/data, erzeugt von
 * `npm run data`) und reicht sie an <TrapView /> weiter. In GFL Analytics kann <TrapView /> mit
 * denselben Daten direkt eingebunden werden.
 */
export function App() {
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {error ? (
        <div className="tv-boot">
          <b>Daten konnten nicht geladen werden.</b>
          <span>{error}</span>
          <span>Erst im Repo-Hauptordner <code>python scripts/build_data.py</code>, dann hier <code>npm run data</code> ausführen.</span>
        </div>
      ) : index && season ? (
        <TrapView data={{ index, season }} loading={loading} onSeasonChange={pickSeason} />
      ) : (
        <div className="tv-boot"><span>Lade GFL-Daten …</span></div>
      )}
    </div>
  );
}

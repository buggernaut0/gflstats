'use client';

import '@fontsource/anton';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import { useEffect, useState } from 'react';
import { TrapView } from './TrapView';
import { loadIndex, loadSeason } from './data/load';
import type { DataIndex, SeasonData } from './data/types';
import { SITE_BASE } from './paths';
import './ui/styles.css';
import { useI18n } from '../i18n/react';

/**
 * Hülle der Trap View in GFL Analytics (Seite /trap-view/): lädt die aus den Website-Daten exportierten
 * Dateien (public/trapview/data, erzeugt von `npm run data:trapview`) und reicht sie an <TrapView /> weiter.
 * Der Spielsimulator ist eine eigene Seite (/simulieren/, siehe SimApp.tsx). Füllt seinen Container vollständig.
 */
export function App() {
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { m } = useI18n();

  // Alte Links auf den früher eingebetteten Simulator (/trap-view/#simulator) führen auf die neue Seite
  useEffect(() => {
    const redirect = () => {
      if (window.location.hash.startsWith('#simulator')) window.location.replace(`${SITE_BASE}/simulieren/`);
    };
    redirect();
    window.addEventListener('hashchange', redirect);
    return () => window.removeEventListener('hashchange', redirect);
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

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {error ? (
        <div className="tv-boot">
          <b>{m.trapview.loadFailed}</b>
          <span>{error}</span>
          <span>{m.trapview.loadHint}</span>
        </div>
      ) : index && season ? (
        <TrapView data={{ index, season }} loading={loading} onSeasonChange={pickSeason} />
      ) : (
        <div className="tv-boot"><span>{m.trapview.loadingData}</span></div>
      )}
    </div>
  );
}

'use client';

import '@fontsource/anton';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import { SimulatorView } from './simview/SimulatorView';

/**
 * Hülle des Spielsimulators (Seite /simulieren/). Eigenständig – braucht die Trap View nicht:
 * SimulatorView lädt Simulationsdaten und Saison selbst (data/sim-2026.json, data/season-2026.json).
 */
export function SimApp() {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <SimulatorView />
    </div>
  );
}

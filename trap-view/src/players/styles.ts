import type { Build } from '../data/types';

/**
 * Darstellungsstile des Spielermodells. Alle nutzen dasselbe Skelett, dieselben Haltungen, Teamfarben,
 * Rückennummern und Kamerafahrten – sie unterscheiden sich nur in Proportionen, Detailgrad und Material.
 *
 * Vorbilder aus US-Übertragungen:
 *  - broadcast: cinematische Studio-/Pregame-Grafik (FOX, ESPN) – realistische Ausrüstung.
 *  - athletic:  Videospiel-Avatare wie im „Madden NFL Cast“ (NBC/Peacock, EA Sports) – heroische Proportionen.
 *  - tracking:  Tracking-Visualisierungen auf Basis von Next Gen Stats (Prime Vision, Yahoo PlayAR) –
 *               einfarbige, ruhige Figuren, damit Daten und Positionen im Vordergrund stehen.
 *  - hologram:  AR-Grafik wie bei ESPNs Monday Night Football – leuchtende, durchscheinende Figuren mit Kantenlicht.
 */
export type ModelStyle = 'broadcast' | 'athletic' | 'tracking' | 'hologram';

export interface StyleParams {
  label: string;
  hint: string;
  /** zusätzliche Gesamtskalierung */
  scale: number;
  /** Körperbau [Breite, Höhe, Tiefe] – überschreibt die Standardwerte */
  build: Record<Build, [number, number, number]>;
  /** Faktor für Schulterpolster */
  pads: number;
  /** Querschnitt von Armen/Oberschenkeln */
  limbs: number;
  /** Kleine Ausrüstungsteile (Streifen, Bänder, Helmdetails) zeichnen */
  details: boolean;
  /** Schatten werfen */
  shadows: boolean;
}

const BASE_BUILD: Record<Build, [number, number, number]> = {
  line: [1.2, 1.03, 1.3],
  big: [1.08, 1.02, 1.1],
  skill: [0.98, 1.0, 0.98],
};

export const STYLES: Record<ModelStyle, StyleParams> = {
  broadcast: {
    label: 'Broadcast', hint: 'Realistische Ausrüstung, cinematisches Licht',
    scale: 1, build: BASE_BUILD, pads: 1, limbs: 1, details: true, shadows: true,
  },
  athletic: {
    label: 'Athletic', hint: 'Videospiel-Proportionen: breitere Pads, kräftigere Arme, längere Linien',
    scale: 1.05,
    build: { line: [1.26, 1.04, 1.32], big: [1.15, 1.05, 1.12], skill: [1.05, 1.04, 1.0] },
    pads: 1.16, limbs: 1.16, details: true, shadows: true,
  },
  tracking: {
    label: 'Tracking', hint: 'Einfarbige Figuren wie in Next-Gen-Stats-Grafiken',
    scale: 1, build: BASE_BUILD, pads: 1, limbs: 1, details: false, shadows: true,
  },
  hologram: {
    label: 'Hologram', hint: 'Leuchtende AR-Figuren mit Kantenlicht',
    scale: 1, build: BASE_BUILD, pads: 1.05, limbs: 1, details: true, shadows: false,
  },
};

export const STYLE_ORDER: ModelStyle[] = ['broadcast', 'athletic', 'tracking', 'hologram'];

export const isModelStyle = (x: unknown): x is ModelStyle => typeof x === 'string' && x in STYLES;

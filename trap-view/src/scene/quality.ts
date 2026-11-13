/** Darstellungsqualität – auf Touch-Geräten und schwachen Rechnern sparsamer. */
export interface Quality {
  tier: 'high' | 'low';
  /** Grenzen der Pixeldichte des Canvas */
  dpr: [number, number];
  /** MSAA-Samples im Nachbearbeitungs-Puffer */
  msaa: number;
  shadowMap: number;
  /** Auflösung der Feldtextur in Pixel pro Yard */
  fieldPPY: number;
}

const HIGH: Quality = { tier: 'high', dpr: [1, 1.75], msaa: 4, shadowMap: 2048, fieldPPY: 32 };
const LOW: Quality = { tier: 'low', dpr: [1, 1.5], msaa: 0, shadowMap: 1024, fieldPPY: 16 };

export function detectQuality(): Quality {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || fewCores ? LOW : HIGH;
}

/** true, wenn der Browser WebGL 2 bereitstellt (Voraussetzung für die 3D-Szene). */
export function webglAvailable(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

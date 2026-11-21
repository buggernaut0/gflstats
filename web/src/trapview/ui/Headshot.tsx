import { useState, type ReactNode } from 'react';
import { photoUrl } from '../../lib/photo';

/**
 * Spielerfoto als Porträtkachel (4:5) für Duell, Vergleichsfenster und Fokus-Labels.
 * Quelle ist allein die zentrale Foto-Referenz des Spielers (players.json → photo). Ohne Foto – oder wenn es
 * nicht lädt – erscheint `fallback` (der bisherige Platzhalter, z. B. die Rückennummer).
 * Farben über CSS-Variablen des umgebenden Elements: --team (Kachelgrund), --accent (Kante unten).
 */
export function Headshot({ src, alt, className = '', fallback = null }: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const url = photoUrl(src);
  const [broken, setBroken] = useState<string | null>(null);
  if (!url || broken === url) return <>{fallback}</>;
  return (
    <span className={`tv-headshot ${className}`}>
      <img src={url} alt={alt} decoding="async" draggable={false} onError={() => setBroken(url)} />
    </span>
  );
}

/** Lädt die Fotos vorab in den Browser-Cache, damit sie beim Duell sofort stehen (kein Aufploppen). */
export function preloadPhotos(srcs: (string | null | undefined)[]) {
  if (typeof window === 'undefined') return;
  for (const s of new Set(srcs)) {
    const url = photoUrl(s);
    if (!url) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}

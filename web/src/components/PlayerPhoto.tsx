"use client";

import { useState, type ReactNode } from "react";
import { photoUrl } from "@/lib/photo";
import type { Player } from "@/lib/types";

/** Feste Größen je Einsatzort – innerhalb vergleichbarer Komponenten immer gleich, stets 4:5. */
const SIZES = { xs: 28, sm: 40, md: 64 } as const;

/**
 * Spielerfoto der Website. Einzige Bildquelle ist die zentrale Foto-Referenz des Spielers (players.json → photo,
 * aus curation/player_photos.json); dieselbe Datei nutzt die Trap View. Hochformat 4:5, Kopf oben verankert,
 * nichts wird verzerrt. Ohne Foto – oder wenn es nicht lädt – erscheint `fallback`, sonst ein neutraler Platzhalter
 * in derselben Größe, damit Listen bündig bleiben.
 */
export default function PlayerPhoto({ photo, name, size = "sm", width, className = "", fallback }: {
  photo: Player["photo"] | null | undefined;
  name: string;
  /** "fill" = volle Breite des umgebenden Elements */
  size?: keyof typeof SIZES | "fill";
  /** feste Breite in px (überschreibt size), Höhe folgt aus 4:5 */
  width?: number;
  className?: string;
  fallback?: ReactNode;
}) {
  const url = photoUrl(photo?.src);
  const [broken, setBroken] = useState<string | null>(null);
  const w: number | string = width ?? (size === "fill" ? "100%" : SIZES[size]);
  if (!url || broken === url) {
    if (fallback !== undefined) return <>{fallback}</>;
    return <Placeholder w={w} className={className} />;
  }
  return (
    <span className={`player-photo relative block shrink-0 overflow-hidden ${className}`} style={{ width: w, aspectRatio: "4 / 5" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- statischer Export, Bilder sind bereits verkleinert (320 × 400) */}
      <img
        src={url}
        alt={name}
        width={320}
        height={400}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(url)}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
    </span>
  );
}

/** Neutraler Platzhalter (Silhouette) in Fotogröße – kein Bild eines anderen Spielers, keine erfundenen Daten. */
function Placeholder({ w, className }: { w: number | string; className: string }) {
  return (
    <span className={`player-photo player-photo--empty relative block shrink-0 ${className}`} style={{ width: w, aspectRatio: "4 / 5" }} aria-hidden="true">
      <svg viewBox="0 0 40 50" className="absolute inset-0 h-full w-full">
        <circle cx="20" cy="19" r="7.5" fill="var(--line-strong)" opacity="0.18" />
        <path d="M6 50c0-9.5 6.3-16 14-16s14 6.5 14 16z" fill="var(--line-strong)" opacity="0.18" />
      </svg>
    </span>
  );
}

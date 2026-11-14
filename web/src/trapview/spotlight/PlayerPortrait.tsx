import { useId, useState } from 'react';
import type { Kit } from '../data/kits';

/**
 * Porträtfläche der Spotlight-Karte.
 *
 * Mit Foto (`photo`): das Bild füllt die Fläche, unten weich ausgeblendet. Ohne Foto – derzeit der
 * Normalfall – eine stilisierte Büste in der Ausrüstung, die der Spieler auf dem Feld trägt: Helm mit
 * getöntem Visier (kein Gesicht), Facemask, Schulterpolster, Trikot mit Rückennummer aus dem Kader.
 * Lässt sich ein Foto nicht laden, fällt die Fläche automatisch auf die Büste zurück.
 */
export function PlayerPortrait({ kit, number, photo, alt }: {
  kit: Kit;
  /** Nur aus dem offiziellen Kader; ohne Kader bleibt die Brust leer */
  number: number | null;
  /** vollständige URL eines Spielerfotos oder null */
  photo: string | null;
  alt: string;
}) {
  const [broken, setBroken] = useState(false);
  if (photo && !broken) {
    return (
      <div className="tv-portrait tv-portrait--photo">
        <img src={photo} alt={alt} onError={() => setBroken(true)} draggable={false} />
      </div>
    );
  }
  return (
    <div className="tv-portrait" role="img" aria-label={`${alt} – stilisierte Darstellung, kein Foto vorhanden`}>
      <Bust kit={kit} number={number} />
    </div>
  );
}

function Bust({ kit, number }: { kit: Kit; number: number | null }) {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${uid}-${name}`;
  const shell =
    'M68 108 C64 60 90 34 120 34 C150 34 176 60 172 108 L173 128 C173 140 162 147 151 147 L89 147 C78 147 67 140 67 128 Z';
  const torso =
    'M10 300 L20 238 C24 207 44 189 74 181 C88 177 98 171 104 160 L136 160 C142 171 152 177 166 181 C196 189 216 207 220 238 L230 300 Z';

  return (
    <svg viewBox="0 0 240 300" className="tv-bust" aria-hidden="true">
      <defs>
        <linearGradient id={id('jersey')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={kit.jersey} />
          <stop offset="1" stopColor={kit.jersey} stopOpacity="0.72" />
        </linearGradient>
        <radialGradient id={id('shine')} cx="0.34" cy="0.22" r="0.85">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
        </radialGradient>
        <linearGradient id={id('visor')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d2533" />
          <stop offset="0.55" stopColor="#07090d" />
          <stop offset="1" stopColor="#141a24" />
        </linearGradient>
        <linearGradient id={id('shade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="0.5" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.5" />
        </linearGradient>
        <clipPath id={id('shell')}><path d={shell} /></clipPath>
        <clipPath id={id('torso')}><path d={torso} /></clipPath>
      </defs>

      {/* Trikot mit Schulterpolstern */}
      <path d={torso} fill={`url(#${id('jersey')})`} />
      <g clipPath={`url(#${id('torso')})`}>
        {/* Polsterkanten */}
        <path d="M20 238 C30 214 50 198 80 190" stroke="#000" strokeOpacity="0.28" strokeWidth="3" fill="none" />
        <path d="M220 238 C210 214 190 198 160 190" stroke="#000" strokeOpacity="0.28" strokeWidth="3" fill="none" />
        {/* Ärmelstreifen in Trim-Farbe */}
        <path d="M14 262 C22 232 34 214 52 202" stroke={kit.trim} strokeWidth="7" fill="none" />
        <path d="M10 276 C18 246 30 228 46 216" stroke={kit.trim} strokeWidth="3" fill="none" />
        <path d="M226 262 C218 232 206 214 188 202" stroke={kit.trim} strokeWidth="7" fill="none" />
        <path d="M230 276 C222 246 210 228 194 216" stroke={kit.trim} strokeWidth="3" fill="none" />
        <rect x="0" y="150" width="240" height="150" fill={`url(#${id('shade')})`} />
      </g>
      {/* Kragen und Halsschutz */}
      <path d="M100 160 L120 190 L140 160 Z" fill="#101216" stroke={kit.trim} strokeWidth="3" strokeLinejoin="round" />
      <rect x="103" y="138" width="34" height="26" rx="6" fill="#121418" />
      {number != null && (
        <text
          x="120" y="268" textAnchor="middle"
          fontFamily="Anton, Impact, sans-serif" fontSize="58" letterSpacing="1"
          fill={kit.number} stroke={kit.numberOutline} strokeWidth="2.5" paintOrder="stroke"
        >
          {number}
        </text>
      )}

      {/* Helm */}
      <path d={shell} fill={kit.helmet} />
      <g clipPath={`url(#${id('shell')})`}>
        <rect x="112" y="20" width="16" height="72" fill={kit.helmetStripe} />
        <rect x="106" y="20" width="3" height="72" fill={kit.helmetStripe} opacity="0.7" />
        <rect x="131" y="20" width="3" height="72" fill={kit.helmetStripe} opacity="0.7" />
        <path d={shell} fill={`url(#${id('shine')})`} />
      </g>
      <circle cx="74" cy="114" r="5" fill="#000" opacity="0.45" />
      <circle cx="166" cy="114" r="5" fill="#000" opacity="0.45" />
      {/* Getöntes Visier – bewusst kein Gesicht */}
      <path
        d="M84 90 L156 90 C161 90 163 94 163 99 L160 128 C159 137 152 142 144 142 L96 142 C88 142 81 137 80 128 L77 99 C77 94 79 90 84 90 Z"
        fill={`url(#${id('visor')})`}
      />
      <path d="M90 95 L118 95 L100 118 L86 118 Z" fill="#ffffff" opacity="0.07" />
      <path d="M84 92 L156 92" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.5" />
      {/* Facemask */}
      <g stroke={kit.facemask} strokeWidth="4.2" strokeLinecap="round" fill="none">
        <path d="M78 104 L82 131 Q90 148 120 148 Q150 148 158 131 L162 104" />
        <path d="M79 116 Q120 125 161 116" />
        <path d="M83 131 Q120 140 157 131" />
        <path d="M120 120 L120 147" />
        <path d="M101 118 L103 145" />
        <path d="M139 118 L137 145" />
      </g>
      <path d={shell} fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.5" />
    </svg>
  );
}

"use client";

import { useState } from "react";

/**
 * YouTube-Video mit Klick-zum-Laden: Vor dem Klick wird nichts von YouTube geladen (kein Vorschaubild,
 * keine Cookies), gezeigt wird ein eigenes Plakat (children). Erst der Klick bindet den offiziellen
 * Player ueber youtube-nocookie.com ein. Der Link zu YouTube bleibt als Ausweichweg immer sichtbar,
 * falls ein Video nicht eingebettet werden darf oder entfernt wurde.
 */
export default function VideoPlayer({
  youtubeId,
  title,
  channel,
  meta,
  children,
}: {
  youtubeId: string;
  title: string;
  channel?: string | null;
  /** Zusatz in der Bildunterschrift, z. B. Veroeffentlichungsdatum */
  meta?: string;
  /** Plakat hinter dem Play-Knopf */
  children?: React.ReactNode;
}) {
  const [playing, setPlaying] = useState(false);
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative aspect-video bg-[#0b1320]">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 block h-full w-full text-left" aria-label={`Video abspielen: ${title}`}>
            {children ?? <span className="video-poster absolute inset-0" aria-hidden="true" />}
            <span className="absolute left-1/2 top-1/2 grid h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/40 group-hover:scale-105 group-focus-visible:scale-105" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
            <span className="absolute bottom-2.5 right-3 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white/90">YouTube, lädt erst beim Klick</span>
          </button>
        )}
      </div>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] text-ink" title={title}>{title}</span>
          <span className="text-[12px] text-ink-3">
            YouTube{channel ? `, Kanal ${channel}` : ""}
            {meta ? `, ${meta}` : ""}
          </span>
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[13px] text-accent-text underline-offset-4 hover:underline">
          Auf YouTube öffnen
        </a>
      </figcaption>
    </figure>
  );
}

/** Kleines Kennzeichen "Highlights vorhanden" fuer Listen. */
export function VideoMark({ label = "Highlights" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-3" title="Zu diesem Spiel gibt es ein Highlight-Video">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2.5" y="5" width="19" height="14" rx="3" />
        <path d="M10 9.2v5.6l5-2.8z" fill="currentColor" stroke="none" />
      </svg>
      {label && <span>{label}</span>}
    </span>
  );
}

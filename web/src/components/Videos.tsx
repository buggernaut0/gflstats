import type { Player } from "@/lib/types";
import VideoPlayer from "./VideoPlayer";

/** YouTube-Adresse -> Video-ID (watch?v=, youtu.be/, shorts/, embed/). */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/**
 * Highlight-Videos: YouTube wird per Klick ueber den offiziellen Einbettungs-Player (datensparsame
 * Variante youtube-nocookie.com, siehe VideoPlayer) gezeigt; Instagram und andere Quellen als Link, weil
 * Instagram-Beitraege nicht frei einbettbar sind.
 */
export default function Videos({ videos }: { videos: Player["videos"] }) {
  if (!videos.length) {
    return (
      <div className="rounded-xl border border-dashed border-line px-5 py-6 text-[14px] text-ink-2">
        <p className="text-ink">Noch keine Highlight-Videos hinterlegt.</p>
        <p className="mt-1 text-[13px] text-ink-3">
          Videos werden in <code className="rounded bg-surface-2 px-1">curation/videos.json</code> mit der Spieler-ID eingetragen. YouTube erscheint direkt hier, Instagram als Link.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {videos.map((v) => {
        const id = v.platform === "youtube" ? youtubeId(v.url) : null;
        return id ? (
          <VideoPlayer key={v.url} youtubeId={id} title={v.title ?? "Highlight-Video"} />
        ) : (
          <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-4 hover:border-line-strong">
            <span>
              <span className="block text-[14px] text-ink">{v.title ?? "Highlight-Video"}</span>
              <span className="text-[12.5px] text-ink-3">{v.platform === "instagram" ? "Auf Instagram ansehen" : new URL(v.url).hostname}</span>
            </span>
            <span aria-hidden="true" className="text-ink-3">↗</span>
          </a>
        );
      })}
    </div>
  );
}

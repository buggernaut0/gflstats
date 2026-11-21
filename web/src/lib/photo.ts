/**
 * Spielerfotos: einzige Stelle, die aus der zentralen Foto-Referenz (players.json → photo.src, erzeugt aus
 * curation/player_photos.json) eine Bildadresse macht. Website und Trap View nutzen dieselbe Funktion.
 */
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** Adresse eines Spielerfotos (Pfad ab Website-Wurzel, z. B. "players/max-muster.webp?v=1a2b3c4d") oder null. */
export function photoUrl(src: string | null | undefined): string | null {
  return src ? `${BASE}/${src.replace(/^\//, "")}` : null;
}

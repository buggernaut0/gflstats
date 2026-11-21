/**
 * Lädt die zugeordneten Spielerfotos (curation/player_photos.json) und legt sie einheitlich ab:
 * web/public/players/<spieler-id>.webp, 320 × 400 px (4:5, Porträt), Kopf oben verankert, Transparenz bleibt.
 *
 *   npm run photos          fehlende Fotos laden
 *   npm run photos -- --neu alle Fotos neu laden
 *
 * Die Zuordnung selbst entsteht in scripts/match_player_photos.py; hier wird nichts zugeordnet.
 * Gespeichert wird nur, was sich als Bild öffnen lässt. Fehler stehen am Ende in der Ausgabe.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MAP = join(ROOT, "curation", "player_photos.json");
const OUT = join(ROOT, "web", "public", "players");
const W = 320;
const H = 400;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

interface Photo { team: string; number: number; name: string; image: string; source: string }

async function fetchImage(url: string, referer: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Referer: referer } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    await sharp(buf).metadata(); // wirft, wenn es kein Bild ist
    return buf;
  } catch {
    return null;
  }
}

async function render(buf: Buffer): Promise<Buffer> {
  let img = sharp(buf).rotate();
  const meta = await img.metadata();
  // Freisteller (transparenter Rand): Rand abschneiden, damit alle Spieler gleich groß im Rahmen stehen
  if (meta.hasAlpha) {
    const { data } = await sharp(buf).ensureAlpha().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    if (data[3] === 0) {
      const trimmed = await img.trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
      // etwas Luft über dem Kopf, damit kein Helm/Haar an der Oberkante klebt
      const top = Math.round(trimmed.info.height * 0.06);
      img = sharp(await sharp(trimmed.data).extend({ top, background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer());
    }
  }
  return img.resize(W, H, { fit: "cover", position: "north" }).webp({ quality: 80, alphaQuality: 90, effort: 5 }).toBuffer();
}

async function main() {
  const fresh = process.argv.includes("--neu");
  const { photos } = JSON.parse(readFileSync(MAP, "utf8")) as { photos: Record<string, Photo> };
  mkdirSync(OUT, { recursive: true });
  // Dateien ohne Zuordnung entfernen (z. B. nach einer Korrektur der Zuordnung)
  for (const f of readdirSync(OUT)) if (f.endsWith(".webp") && !photos[f.slice(0, -5)]) rmSync(join(OUT, f));

  const ids = Object.keys(photos).filter((id) => fresh || !existsSync(join(OUT, `${id}.webp`)));
  const failed: string[] = [];
  let done = 0;
  const queue = [...ids];
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const p = photos[id];
      // WordPress: Datei ohne Größenangabe ist das Original
      const original = p.image.replace(/-\d+x\d+(?=\.\w+$)/, "");
      const buf = (original !== p.image ? await fetchImage(original, p.source) : null) ?? (await fetchImage(p.image, p.source));
      if (!buf) { failed.push(`${id}: ${p.image}`); continue; }
      await sharp(await render(buf)).toFile(join(OUT, `${id}.webp`));
      done++;
    }
  }));
  console.log(`${done} Fotos gespeichert, ${Object.keys(photos).length - ids.length} bereits vorhanden, ${failed.length} fehlgeschlagen`);
  for (const f of failed) console.log(`  fehlgeschlagen: ${f}`);
}

main();

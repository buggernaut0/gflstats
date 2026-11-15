import * as THREE from 'three';
import { JERSEY_Y, NUM_PER_U, SHOULDER_RECT } from './parts';

/** Eine Kachel = abgewickelter Trikot-Rumpf eines Spielers (u einmal um den Körper, v Taille → Kragen). */
const TILE_W = 512;
const TILE_H = 256;
const COLS = 4;

export interface NumberAtlas {
  texture: THREE.CanvasTexture;
  tileScale: [number, number];
  /** UV-Ursprung der Kachel von Eintrag i */
  tile: (i: number) => [number, number];
}

/**
 * Rückennummern und Namen aller Spieler in EINER Textur (statt einer 1024×512-Textur je Spieler).
 * Gespeichert werden nur Masken – R: Ziffern und Name, G: Kontur. Die Farben kommen je Spieler aus
 * dem Kit, das Trikot selbst aus der Teamfarbe. Brust um u = 0.75, Rücken um u = 0.25, dazwischen
 * (SHOULDER_RECT) die kleine Schulternummer.
 * Ohne belegte Nummer bleibt das Trikot ohne Nummer – es wird keine erfunden.
 */
export function createNumberAtlas(entries: { number: number | null; name: string | null }[]): NumberAtlas {
  const rows = Math.max(1, Math.ceil(entries.length / COLS));
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE_W;
  canvas.height = rows * TILE_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const span = JERSEY_Y[1] - JERSEY_Y[0];
  const yOf = (m: number) => TILE_H - ((m - JERSEY_Y[0]) / span) * TILE_H;

  entries.forEach((e, i) => {
    const x0 = (i % COLS) * TILE_W;
    const y0 = Math.floor(i / COLS) * TILE_H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 + 2, y0 + 2, TILE_W - 4, TILE_H - 4);
    ctx.clip();
    ctx.translate(x0, y0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    // Waagerecht deckt die Kachel NUM_PER_U Meter ab (Bogenlänge am Trikot), senkrecht die Trikothöhe:
    // mit diesem Faktor gezeichnet erscheinen Ziffern am Körper in ihren echten Proportionen.
    const squash = (TILE_W / NUM_PER_U) / (TILE_H / span);
    const digits = (u: number, heightM: number, centerM: number) => {
      const size = (heightM / span) * TILE_H * 1.25;
      ctx.save();
      ctx.translate(u * TILE_W, yOf(centerM));
      ctx.scale(squash, 1);
      ctx.font = `${size}px Anton`;
      ctx.lineWidth = size * 0.1;
      ctx.strokeStyle = '#00ff00';
      ctx.strokeText(String(e.number), 0, size * 0.05);
      ctx.fillStyle = '#ff0000';
      ctx.fillText(String(e.number), 0, size * 0.05);
      ctx.restore();
    };
    if (e.number != null) {
      digits(0.75, 0.15, 0.27);
      digits(0.25, 0.19, 0.26);
      // Schulternummer: füllt ihr Rechteck, das Modell legt es auf beide Schultern (lesbar von vorn)
      const [ru0, rv0, ru1, rv1] = SHOULDER_RECT;
      const rw = (ru1 - ru0) * TILE_W;
      const rh = (rv1 - rv0) * TILE_H;
      const text = String(e.number);
      ctx.save();
      ctx.translate(((ru0 + ru1) / 2) * TILE_W, TILE_H - ((rv0 + rv1) / 2) * TILE_H);
      ctx.font = '100px Anton';
      const m = ctx.measureText(text);
      // Das Rechteck liegt auf rund 10 cm (quer) × 13 cm (längs) Schulterfläche: Ziffern entsprechend entzerren
      const sy = (rh * 0.62) / 100;
      const sx = Math.min(sy * ((rw / 0.1) / (rh / 0.13)), (rw * 0.9) / m.width);
      ctx.scale(sx, sy);
      ctx.fillStyle = '#ff0000';
      ctx.fillText(text, 0, 6);
      ctx.restore();
    }
    if (e.name) {
      ctx.save();
      ctx.translate(0.25 * TILE_W, yOf(0.405));
      ctx.scale(squash, 1);
      ctx.font = '600 26px "Barlow Condensed"';
      ctx.fillStyle = '#ff0000';
      ctx.fillText(e.name.toUpperCase().split('').join(' '), 0, 0);
      ctx.restore();
    }
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  return {
    texture,
    tileScale: [1 / COLS, 1 / rows],
    tile: (i) => [(i % COLS) / COLS, 1 - (Math.floor(i / COLS) + 1) / rows],
  };
}

import * as THREE from 'three';
import '@fontsource/barlow-condensed/800.css';
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
 * Schrift der Rückennamen: Barlow Condensed in Extra Bold – kräftig wie aufgenähte Tackle-Twill-Buchstaben.
 * Muss vor dem Zeichnen geladen sein (TrapView.tsx und die Starting Lineup laden sie über diese Konstante).
 */
export const JERSEY_NAME_FONT = '800 30px "Barlow Condensed"';

/** Breitester Rückenname (Anteil der Kachelbreite, nach dem Entzerren) – längere Namen werden schmaler gesetzt. */
const NAME_MAX_W = 0.34;

type Ink = 'mask' | 'height';

/**
 * Rückennummern und Namen aller Spieler in EINER Textur (statt einer 1024×512-Textur je Spieler).
 * Gespeichert werden nur Masken – R: Ziffern und Name, G: Kontur, B: Relief (weichgezeichnete Höhe der
 * Beschriftung, daraus berechnet der Shader ein leichtes Bump-Mapping: die Buchstaben wirken aufgenäht statt
 * aufgedruckt). Die Farben kommen je Spieler aus dem Kit, das Trikot selbst aus der Teamfarbe. Brust um
 * u = 0.75, Rücken um u = 0.25, dazwischen (SHOULDER_RECT) die kleine Schulternummer.
 * Ohne belegte Nummer bleibt das Trikot ohne Nummer – es wird keine erfunden.
 */
export function createNumberAtlas(entries: { number: number | null; name: string | null }[]): NumberAtlas {
  const rows = Math.max(1, Math.ceil(entries.length / COLS));
  const make = () => {
    const c = document.createElement('canvas');
    c.width = COLS * TILE_W;
    c.height = rows * TILE_H;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    return { c, ctx };
  };
  const { c: canvas, ctx } = make();
  const relief = make();

  const span = JERSEY_Y[1] - JERSEY_Y[0];
  const yOf = (m: number) => TILE_H - ((m - JERSEY_Y[0]) / span) * TILE_H;
  // Waagerecht deckt die Kachel NUM_PER_U Meter ab (Bogenlänge am Trikot), senkrecht die Trikothöhe:
  // mit diesem Faktor gezeichnet erscheinen Ziffern am Körper in ihren echten Proportionen.
  const squash = (TILE_W / NUM_PER_U) / (TILE_H / span);

  /** Zeichnet eine Kachel – als Farbmaske (R Füllung, G Kontur) oder als Höhe (B, Füllung und Kontur). */
  const drawTile = (ctx: CanvasRenderingContext2D, e: (typeof entries)[number], i: number, ink: Ink) => {
    const fill = ink === 'mask' ? '#ff0000' : '#0000ff';
    const stroke = ink === 'mask' ? '#00ff00' : '#0000ff';
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

    const digits = (u: number, heightM: number, centerM: number) => {
      const size = (heightM / span) * TILE_H * 1.25;
      ctx.save();
      ctx.translate(u * TILE_W, yOf(centerM));
      ctx.scale(squash, 1);
      ctx.font = `${size}px Anton`;
      ctx.lineWidth = size * 0.1;
      ctx.strokeStyle = stroke;
      ctx.strokeText(String(e.number), 0, size * 0.05);
      ctx.fillStyle = fill;
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
      ctx.fillStyle = fill;
      ctx.fillText(text, 0, 6);
      ctx.restore();
    }
    if (e.name) {
      // Rückenname wie aufgenähte Trikotbuchstaben: Extra Bold, gesperrt, mit schmaler Kontur in der
      // Konturfarbe der Nummern. Lange Namen werden schmaler gesetzt statt über die Schulterblätter zu laufen.
      const text = e.name.toUpperCase().split('').join(' ');
      ctx.save();
      ctx.translate(0.25 * TILE_W, yOf(0.405));
      ctx.font = JERSEY_NAME_FONT;
      const w = ctx.measureText(text).width * squash;
      ctx.scale(squash * Math.min(1, (NAME_MAX_W * TILE_W) / Math.max(w, 1)), 1);
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = stroke;
      ctx.strokeText(text, 0, 1);
      ctx.fillStyle = fill;
      ctx.fillText(text, 0, 1);
      ctx.restore();
    }
    ctx.restore();
  };

  entries.forEach((e, i) => {
    drawTile(ctx, e, i, 'mask');
    drawTile(relief.ctx, e, i, 'height');
  });
  // Relief weichzeichnen und in den Blaukanal addieren (ohne Canvas-Filter bleibt die Kante hart – auch gut)
  ctx.save();
  ctx.filter = 'blur(1.4px)';
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(relief.c, 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  return {
    texture,
    tileScale: [1 / COLS, 1 / rows],
    tile: (i) => [(i % COLS) / COLS, 1 - (Math.floor(i / COLS) + 1) / rows],
  };
}

import * as THREE from 'three';
import { JERSEY_Y } from './parts';

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
 * dem Kit, das Trikot selbst aus der Teamfarbe. Vorderseite bei u = 0.75, Rücken bei u = 0.25.
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

    const digits = (u: number, heightM: number, centerM: number) => {
      const size = (heightM / span) * TILE_H * 1.25;
      ctx.save();
      ctx.translate(u * TILE_W, yOf(centerM));
      ctx.scale(0.82, 1); // gleicht die Dehnung auf der flachen Brust aus
      ctx.font = `${size}px Anton`;
      ctx.lineWidth = size * 0.1;
      ctx.strokeStyle = '#00ff00';
      ctx.strokeText(String(e.number), 0, size * 0.05);
      ctx.fillStyle = '#ff0000';
      ctx.fillText(String(e.number), 0, size * 0.05);
      ctx.restore();
    };
    if (e.number != null) {
      digits(0.75, 0.16, 0.3);
      digits(0.25, 0.19, 0.27);
    }
    if (e.name) {
      ctx.save();
      ctx.translate(0.25 * TILE_W, yOf(0.425));
      ctx.scale(0.82, 1);
      ctx.font = '600 24px "Barlow Condensed"';
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

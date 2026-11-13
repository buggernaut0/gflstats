import * as THREE from 'three';
import { FIELD } from './fieldCoords';

export interface FieldTextureOptions {
  /** Endzone hinter der Offense (−X). */
  leftEndzone: { color: string; text: string; textColor: string };
  /** Endzone hinter der Defense (+X). */
  rightEndzone: { color: string; text: string; textColor: string };
  /** Pixel pro Yard (Standard 32; auf schwächeren Geräten 16 – ein Viertel des Texturspeichers) */
  ppy?: number;
}

const LINE = '#e4e8e1';

/** Deterministischer Zufall, damit das Feld bei jedem Start gleich aussieht. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Zeichnet das komplette Feld (Rasen, Mähstreifen, Linien, Hashmarks, Zahlen, Endzonen)
 * einmalig in eine Canvas-Textur. Die Textur deckt Feld + Randstreifen ab.
 */
export function createFieldTexture(opts: FieldTextureOptions): THREE.CanvasTexture {
  const PPY = opts.ppy ?? 32;
  const totalL = FIELD.length + FIELD.border * 2;
  const totalW = FIELD.width + FIELD.border * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalL * PPY);
  canvas.height = Math.round(totalW * PPY);
  const ctx = canvas.getContext('2d')!;

  // Feld-Yards (x: −60…60, z: −W/2…W/2) → Canvas-Pixel
  const px = (x: number) => (x + totalL / 2) * PPY;
  const pz = (z: number) => (z + totalW / 2) * PPY;
  const halfW = FIELD.width / 2;

  // Randstreifen
  ctx.fillStyle = '#173a24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Mähstreifen alle 5 Yards
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#27633a' : '#215632';
    ctx.fillRect(px(-50 + i * 5), pz(-halfW), 5 * PPY, FIELD.width * PPY);
  }

  // Endzonen
  const endzone = (x0: number, e: FieldTextureOptions['leftEndzone'], rot: number) => {
    ctx.fillStyle = e.color;
    ctx.fillRect(px(x0), pz(-halfW), FIELD.endzone * PPY, FIELD.width * PPY);
    ctx.save();
    ctx.translate(px(x0 + FIELD.endzone / 2), pz(0));
    ctx.rotate(rot);
    ctx.fillStyle = e.textColor;
    ctx.globalAlpha = 0.92;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 6.2 * PPY;
    ctx.font = `${size}px Anton`;
    const maxW = (FIELD.width - 8) * PPY;
    const w = ctx.measureText(e.text).width;
    if (w > maxW) {
      size *= maxW / w;
      ctx.font = `${size}px Anton`;
    }
    ctx.fillText(e.text, 0, size * 0.04);
    ctx.restore();
  };
  endzone(-60, opts.leftEndzone, Math.PI / 2);
  endzone(50, opts.rightEndzone, -Math.PI / 2);

  // Rasenstruktur: feine Sprenkel
  const rand = rng(7);
  for (let i = 0; i < 90000; i++) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    const l = rand();
    ctx.fillStyle = l > 0.5 ? `rgba(255,255,255,${0.012 + rand() * 0.03})` : `rgba(0,0,0,${0.03 + rand() * 0.06})`;
    ctx.fillRect(x, y, 1 + rand() * 2, 2 + rand() * 5);
  }

  ctx.fillStyle = LINE;
  const lw = 4 / 36; // 4 Zoll in Yards
  const rect = (x: number, z: number, w: number, h: number) =>
    ctx.fillRect(px(x), pz(z), w * PPY, h * PPY);

  // Seiten- und Endlinien (breiter weißer Rahmen)
  const b = 1.4;
  rect(-60 - b, -halfW - b, FIELD.length + 2 * b, b);
  rect(-60 - b, halfW, FIELD.length + 2 * b, b);
  rect(-60 - b, -halfW, b, FIELD.width);
  rect(60, -halfW, b, FIELD.width);

  // Yard-Linien alle 5 Yards, Goal Lines breiter
  for (let x = -50; x <= 50; x += 5) {
    const w = Math.abs(x) === 50 ? lw * 2 : lw;
    rect(x - w / 2, -halfW, w, FIELD.width);
  }

  // Hashmarks und Randmarkierungen für jedes Yard
  const hashZ = halfW - FIELD.hashFromSideline;
  for (let x = -49; x <= 49; x++) {
    if (x % 5 === 0) continue;
    rect(x - lw / 2, -hashZ - 0.33, lw, 0.66);
    rect(x - lw / 2, hashZ - 0.33, lw, 0.66);
    rect(x - lw / 2, -halfW + 0.15, lw, 0.66);
    rect(x - lw / 2, halfW - 0.81, lw, 0.66);
  }

  // Yard-Zahlen
  const numH = 2 * PPY;
  ctx.font = `${numH * 1.18}px Anton`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const numZ = halfW - FIELD.numbersFromSideline + 1;
  for (let x = -40; x <= 40; x += 10) {
    const yard = String(50 - Math.abs(x));
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(px(x), pz(side * numZ));
      if (side === -1) ctx.rotate(Math.PI);
      ctx.fillText(yard[0], -0.95 * PPY, 0);
      ctx.fillText(yard[1], 0.95 * PPY, 0);
      // Richtungspfeil zur näheren Endzone
      if (x !== 0) {
        const dir = (x < 0 ? -1 : 1) * (side === -1 ? -1 : 1);
        const ax = dir * 2.15 * PPY;
        ctx.beginPath();
        ctx.moveTo(ax, -0.28 * PPY);
        ctx.lineTo(ax + dir * 0.5 * PPY, 0);
        ctx.lineTo(ax, 0.28 * PPY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Leichte Abnutzung im Mittelfeld zwischen den Hashmarks
  const wear = ctx.createRadialGradient(px(0), pz(0), 0, px(0), pz(0), 40 * PPY);
  wear.addColorStop(0, 'rgba(60,50,20,0.10)');
  wear.addColorStop(1, 'rgba(60,50,20,0)');
  ctx.fillStyle = wear;
  ctx.fillRect(px(-50), pz(-hashZ - 3), 100 * PPY, (hashZ * 2 + 6) * PPY);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  return tex;
}

/** Kleine, kachelbare Rauschtextur für die Rasen-Unebenheit (Bump). */
export function createGrassBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  const rand = rng(21);
  for (let i = 0; i < 9000; i++) {
    const v = Math.floor(90 + rand() * 90);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 1.5, 2 + rand() * 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(70, 32);
  return tex;
}

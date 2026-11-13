import * as THREE from 'three';
import type { Kit } from '../data/kits';

export const TORSO_HEIGHT = 0.56;

/**
 * Trikot-Textur für den Torso. Der Torso ist ein Rotationskörper; u läuft einmal
 * um den Körper (Naht an der Seite), v von der Taille zum Kragen.
 * Vorderseite liegt bei u = 0.75, Rückseite bei u = 0.25 – die Nummer ist Teil der
 * Oberfläche und kann deshalb von keiner Geometrie verdeckt werden.
 */
export function createJerseyTexture(kit: Kit, number: number | null, lastName: string | null): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const yOf = (meters: number) => H - (meters / TORSO_HEIGHT) * H;

  ctx.fillStyle = kit.jersey;
  ctx.fillRect(0, 0, W, H);

  // Dezente Stoffschattierung: unten etwas dunkler, Seitennähte
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(255,255,255,0.05)');
  shade.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, 5, H);
  ctx.fillRect(W / 2 - 3, 0, 6, H);
  ctx.fillRect(W - 5, 0, 5, H);

  // Kragen und Schulterstreifen
  ctx.fillStyle = kit.trim;
  ctx.fillRect(0, 0, W, yOf(0.538));
  ctx.fillRect(0, yOf(0.455), W, 6);

  // Ohne belegte Rückennummer bleibt das Trikot ohne Nummer – es wird keine erfunden
  const text = number != null ? String(number) : '';
  const draw = (u: number, heightM: number, centerM: number) => {
    const size = (heightM / TORSO_HEIGHT) * H * 1.25;
    ctx.save();
    ctx.translate(u * W, yOf(centerM));
    ctx.scale(0.8, 1); // gleicht die Dehnung auf der flachen Brust aus
    ctx.font = `${size}px Anton`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.09;
    ctx.strokeStyle = kit.numberOutline;
    ctx.strokeText(text, 0, size * 0.05);
    ctx.fillStyle = kit.number;
    ctx.fillText(text, 0, size * 0.05);
    ctx.restore();
  };
  if (text) {
    draw(0.75, 0.17, 0.3); // Brust
    draw(0.25, 0.2, 0.26); // Rücken
  }

  // Namenszug auf dem Rücken
  if (lastName) {
    ctx.save();
    ctx.translate(0.25 * W, yOf(0.415));
    ctx.scale(0.8, 1);
    ctx.font = `600 30px "Barlow Condensed"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = kit.number;
    ctx.fillText(lastName.toUpperCase().split('').join(' '), 0, 0);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

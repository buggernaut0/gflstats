import * as THREE from 'three';
import { TORSO_HEIGHT } from './numberTexture';

/** Torso-Profil: [Höhe in m, Radius in m] von der Taille bis zum Kragen. */
const TORSO_PROFILE: [number, number][] = [
  [0.0, 0.158], [0.08, 0.166], [0.18, 0.185], [0.28, 0.212], [0.36, 0.238],
  [0.42, 0.252], [0.46, 0.24], [0.5, 0.17], [0.53, 0.105], [TORSO_HEIGHT, 0.078],
];

function profileRadius(y: number): number {
  for (let i = 1; i < TORSO_PROFILE.length; i++) {
    const [y0, r0] = TORSO_PROFILE[i - 1];
    const [y1, r1] = TORSO_PROFILE[i];
    if (y <= y1) {
      const t = THREE.MathUtils.smoothstep((y - y0) / (y1 - y0), 0, 1);
      return r0 + (r1 - r0) * t;
    }
  }
  return TORSO_PROFILE[TORSO_PROFILE.length - 1][1];
}

function torso(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const y = (i / N) * TORSO_HEIGHT;
    pts.push(new THREE.Vector2(profileRadius(y), y));
  }
  // phiStart = π/2 legt die Naht unter den Arm; Vorderseite bei u = 0.75
  const g = new THREE.LatheGeometry(pts, 40, Math.PI / 2, Math.PI * 2);
  g.scale(1, 1, 0.66);
  g.computeVertexNormals();
  return g;
}

/**
 * Gliedmaße mit Muskelverlauf: Rotationskörper entlang −Y, Ursprung am oberen Gelenk.
 * `radii` sind Stützstellen von oben nach unten; die Enden werden abgerundet.
 */
function limb(length: number, radii: number[], segments = 14): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const N = 16;
  const rAt = (t: number) => {
    const x = t * (radii.length - 1);
    const i = Math.min(Math.floor(x), radii.length - 2);
    const f = THREE.MathUtils.smoothstep(x - i, 0, 1);
    return radii[i] + (radii[i + 1] - radii[i]) * f;
  };
  const r0 = radii[0];
  const r1 = radii[radii.length - 1];
  for (let i = 0; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * r1, -length - Math.cos(a) * r1));
  }
  for (let i = N - 1; i >= 1; i--) pts.push(new THREE.Vector2(rAt(i / N), -(i / N) * length));
  for (let i = 5; i >= 0; i--) {
    const a = (i / 5) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * r0, Math.cos(a) * r0));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

export const HELMET_R = 0.152;
const OPEN = 0.82; // halbe Öffnung des Gesichtsfelds (rad)
const BROW = 1.18; // Stirnkante (Polarwinkel)

/** Gemeinsame Geometrien aller Spieler – werden genau einmal erzeugt. */
export const GEO = {
  torso: torso(),
  shoulderCap: new THREE.SphereGeometry(1, 20, 14),
  pelvis: new THREE.SphereGeometry(1, 20, 14),
  thigh: limb(0.44, [0.108, 0.116, 0.104, 0.086, 0.074]),
  shin: limb(0.4, [0.07, 0.08, 0.07, 0.054, 0.046]),
  shoe: new THREE.SphereGeometry(1, 14, 10),
  upperArm: limb(0.3, [0.066, 0.07, 0.062, 0.052], 12),
  sleeve: limb(0.13, [0.074, 0.078, 0.076], 12),
  forearm: limb(0.25, [0.05, 0.056, 0.046, 0.038], 12),
  hand: new THREE.SphereGeometry(0.046, 12, 10),
  neck: new THREE.CylinderGeometry(0.058, 0.066, 0.1, 12),
  helmetCap: new THREE.SphereGeometry(HELMET_R, 32, 12, 0, Math.PI * 2, 0, BROW),
  helmetShell: new THREE.SphereGeometry(
    HELMET_R, 28, 10, Math.PI / 2 + OPEN, Math.PI * 2 - OPEN * 2, BROW, 1.2,
  ),
  helmetInner: new THREE.SphereGeometry(HELMET_R * 0.93, 20, 14),
  visor: new THREE.SphereGeometry(0.098, 20, 14),
  maskBar: new THREE.TorusGeometry(HELMET_R * 1.1, 0.0075, 6, 18, 2.1),
  maskPost: new THREE.CylinderGeometry(0.0065, 0.0065, 0.1, 6),
  stripe: new THREE.TorusGeometry(HELMET_R * 1.004, 0.006, 4, 24, Math.PI - 0.42),
  ring: new THREE.RingGeometry(0.62, 0.72, 48),
};

export const MASK_ARC = 2.1;

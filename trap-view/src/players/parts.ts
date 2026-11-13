import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Das eine Spielermodell: 13 starre Körperteile, jedes als EINE zusammengeführte Geometrie.
 * Alle Spieler teilen sich diese Geometrien; gezeichnet wird je Körperteil ein InstancedMesh
 * (siehe squad.ts) – 13 Draw Calls für alle Spieler zusammen, unabhängig von der Spielerzahl.
 *
 * Lokales Koordinatensystem in Metern, Blick nach +Z, Ursprung jedes Teils an seinem Gelenk.
 *
 * Farben stecken nicht in Materialien, sondern in Vertex-Attributen:
 *   color  – feste Farbe (Tape, Sohle, Visier …), nur für Slot 0
 *   aMat   – [Slot, Rauheit, Metall]. Slot 1–3 verweist auf eine der drei Farben, die jede Instanz
 *            (= jeder Spieler) für dieses Körperteil mitbringt (iA, iB, iC – siehe PALETTE in squad.ts).
 *   aNumUv – Lage in der Trikot-Kachel des Nummern-Atlas; (−1, −1) = keine Nummer an dieser Stelle.
 */

// ───────────────────────────────────────────────── Skelettmaße (Meter)

export const THIGH = 0.44;
export const SHIN = 0.44;
/** Höhe des Sprunggelenks über dem Boden. */
export const FOOT = 0.07;
export const UPPER_ARM = 0.29;
/** Seitlicher Abstand der Hüftgelenke von der Körpermitte. */
export const HIP_X = 0.088;
/** Schultergelenk relativ zur Hüftmitte. */
export const SHOULDER: [number, number] = [0.18, 0.445];
/** Kopfgelenk (Oberkante Hals) relativ zur Hüftmitte. */
export const HEAD_JOINT: [number, number, number] = [0, 0.585, -0.004];
/** Helmmitte relativ zum Kopfgelenk und Helmradius – auch für die Label-Höhe. */
export const HELMET_CENTER: [number, number, number] = [0, 0.1, 0.012];
export const HELMET_R = 0.124;
/** Höhenbereich des Trikot-Rumpfs über der Hüftmitte – der Nummern-Atlas bildet genau ihn ab. */
export const JERSEY_Y: [number, number] = [0.03, 0.545];

// ───────────────────────────────────────────────── Bausteine

type Slot = 0 | 1 | 2 | 3;
interface Paint {
  slot?: Slot;
  /** feste Farbe, nur bei Slot 0 */
  color?: string;
  rough?: number;
  metal?: number;
  /** UVs als Nummern-Koordinaten übernehmen (nur Trikot-Rumpf) */
  numbers?: boolean;
}

/** Ersetzt die UVs durch die Attribute des Spielermaterials. */
function paint(g: THREE.BufferGeometry, p: Paint): THREE.BufferGeometry {
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const mat = new Float32Array(n * 3);
  const num = new Float32Array(n * 2);
  const c = new THREE.Color(p.color ?? '#ffffff');
  const uv = g.attributes.uv as THREE.BufferAttribute | undefined;
  for (let i = 0; i < n; i++) {
    col.set([c.r, c.g, c.b], i * 3);
    mat.set([p.slot ?? 0, p.rough ?? 0.7, p.metal ?? 0], i * 3);
    if (p.numbers && uv) num.set([uv.getX(i), uv.getY(i)], i * 2);
    else num.set([-1, -1], i * 2);
  }
  g.deleteAttribute('uv');
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(mat, 3));
  g.setAttribute('aNumUv', new THREE.BufferAttribute(num, 2));
  return g;
}

/** Querschnitt in einer Höhe: [y, halbe Breite (x), halbe Tiefe (z), z-Versatz, Kantigkeit (2 = Ellipse)]. */
type Key = [y: number, a: number, b: number, z?: number, n?: number];

function sample(keys: Key[], y: number): [number, number, number, number] {
  let i = 1;
  while (i < keys.length - 1 && y > keys[i][0]) i++;
  const k0 = keys[i - 1];
  const k1 = keys[i];
  const t = THREE.MathUtils.smoothstep(y, k0[0], k1[0]);
  const mix = (j: 1 | 2 | 3 | 4, d: number) => (k0[j] ?? d) + ((k1[j] ?? d) - (k0[j] ?? d)) * t;
  return [mix(1, 0), mix(2, 0), mix(3, 0), mix(4, 2)];
}

interface TubeOpts {
  /** Ausschnitt des Profils (Standard: ganze Höhe) */
  y0?: number;
  y1?: number;
  rows?: number;
  segs?: number;
  /** Ausschnitt des Umfangs, 0–1 (Naht links, 0.25 hinten, 0.5 rechts, 0.75 vorn) */
  arc?: [number, number];
  /** Aufdickung in Metern – für Stoffschichten und Streifen, die auf dem Körper liegen */
  inflate?: number;
}

/**
 * Schlauch entlang +Y mit frei geformten Querschnitten (Superellipse). Grundform für Rumpf,
 * Gliedmaßen, Schuhe sowie – als Ausschnitt mit `inflate` – für Ärmel, Bündchen und Streifen.
 * u läuft einmal um den Körper, v über die volle Profilhöhe (auch bei Ausschnitten).
 */
function tube(keys: Key[], o: TubeOpts = {}): THREE.BufferGeometry {
  const yMin = keys[0][0];
  const yMax = keys[keys.length - 1][0];
  const y0 = o.y0 ?? yMin;
  const y1 = o.y1 ?? yMax;
  const rows = o.rows ?? 12;
  const segs = o.segs ?? 20;
  const [u0, u1] = o.arc ?? [0, 1];
  const inf = o.inflate ?? 0;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const pw = (v: number, n: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);

  for (let i = 0; i <= rows; i++) {
    const y = y0 + ((y1 - y0) * i) / rows;
    const [a, b, zo, n] = sample(keys, y);
    for (let j = 0; j <= segs; j++) {
      const u = u0 + ((u1 - u0) * j) / segs;
      const phi = Math.PI * 2 * u + Math.PI;
      pos.push((a + inf) * pw(Math.cos(phi), n), y, zo + (b + inf) * pw(Math.sin(phi), n));
      uv.push(u, (y - yMin) / (yMax - yMin));
    }
  }
  const w = segs + 1;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * w + j;
      const b = a + 1;
      const c = a + w;
      const d = c + 1;
      idx.push(a, c, d, a, d, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (!o.arc) {
    // Naht schließen: Normalen der ersten und letzten Spalte mitteln
    const nor = g.attributes.normal as THREE.BufferAttribute;
    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    for (let i = 0; i <= rows; i++) {
      v0.fromBufferAttribute(nor, i * w);
      v1.fromBufferAttribute(nor, i * w + segs);
      v0.add(v1).normalize();
      nor.setXYZ(i * w, v0.x, v0.y, v0.z);
      nor.setXYZ(i * w + segs, v0.x, v0.y, v0.z);
    }
  }
  return g;
}

/** Ellipsoid. */
function ball(r: [number, number, number], at: [number, number, number], ws = 16, hs = 12): THREE.BufferGeometry {
  return new THREE.SphereGeometry(1, ws, hs).scale(...r).translate(...at);
}

/** Runder Stab zwischen zwei Punkten (Facemask). */
function rod(p0: THREE.Vector3, p1: THREE.Vector3, r: number): THREE.BufferGeometry {
  const d = p1.clone().sub(p0);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 6, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate(...p0.clone().add(p1).multiplyScalar(0.5).toArray());
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts, false);
  if (!g) throw new Error('Spielermodell: Geometrien nicht zusammenführbar');
  parts.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
}

// feste Farben
const TAPE = '#ecedef';
const SOLE = '#17181b';
const BELT = '#101114';
const INNER = '#060607';
const VISOR = '#0b0e15';

// Oberflächen: [Rauheit, Metall]
const CLOTH = { rough: 0.72 };
const STRETCH = { rough: 0.5 };
const KNIT = { rough: 0.85 };
const SKIN = { rough: 0.55 };

// ───────────────────────────────────────────────── Körperteile

/** Becken mit Hose und Gürtel. Slots: A Hose. */
function pelvis() {
  const keys: Key[] = [
    [-0.135, 0.02, 0.02, 0, 2.3], [-0.1, 0.1, 0.085, -0.005, 2.3], [-0.04, 0.16, 0.115, -0.008, 2.3],
    [0.03, 0.158, 0.11, -0.004, 2.3], [0.09, 0.15, 0.102, 0, 2.3],
  ];
  return merge([
    paint(tube(keys, { rows: 10, segs: 24 }), { slot: 1, ...STRETCH }),
    paint(tube(keys, { y0: 0.06, y1: 0.09, rows: 1, segs: 24, inflate: 0.004 }), { color: BELT, rough: 0.5 }),
  ]);
}

/** Oberschenkel mit Seitenstreifen außen. Slots: A Hose, B Zierfarbe. */
function thigh(side: 1 | -1) {
  const keys: Key[] = [
    [-0.46, 0.058, 0.062], [-0.44, 0.064, 0.066], [-0.3, 0.078, 0.084, 0.004], [-0.14, 0.092, 0.098, 0.006],
    [-0.03, 0.094, 0.098, 0.002], [0.03, 0.07, 0.08], [0.06, 0.02, 0.02],
  ];
  const arc: [number, number] = side === 1 ? [0.47, 0.53] : [-0.03, 0.03];
  return merge([
    paint(tube(keys, { rows: 12, segs: 18 }), { slot: 1, ...STRETCH }),
    paint(tube(keys, { y0: -0.45, y1: -0.02, rows: 10, segs: 3, arc, inflate: 0.002 }), { slot: 2, ...STRETCH }),
  ]);
}

/** Unterschenkel: Hosenbein übers Knie, Stutzen mit zwei Streifen, Tape am Knöchel. Slots: A Stutzen, B Hose, C Zierfarbe. */
function shin() {
  const keys: Key[] = [
    [-0.44, 0.04, 0.042], [-0.36, 0.043, 0.046, -0.002], [-0.2, 0.06, 0.066, -0.01], [-0.1, 0.064, 0.068, -0.008],
    [0, 0.06, 0.064], [0.03, 0.05, 0.055],
  ];
  return merge([
    paint(tube(keys, { y0: -0.37, y1: -0.07, rows: 9, segs: 16 }), { slot: 1, ...KNIT }),
    paint(tube(keys, { y0: -0.122, y1: -0.104, rows: 1, segs: 16, inflate: 0.002 }), { slot: 3, ...KNIT }),
    paint(tube(keys, { y0: -0.156, y1: -0.138, rows: 1, segs: 16, inflate: 0.002 }), { slot: 3, ...KNIT }),
    paint(tube(keys, { y0: -0.085, y1: 0.03, rows: 4, segs: 16, inflate: 0.006 }), { slot: 2, ...STRETCH }),
    paint(ball([0.067, 0.067, 0.07], [0, 0, 0.004], 14, 10), { slot: 2, ...STRETCH }),
    paint(tube(keys, { y0: -0.44, y1: -0.36, rows: 2, segs: 16, inflate: 0.004 }), { color: TAPE, rough: 0.8 }),
  ]);
}

/** Schuh mit Sohle; liegt entlang +Z, Boden bei y = −FOOT. Slots: A Schuh. */
function foot() {
  // Profil entlang der Schuhlänge; die „Tiefe“ des Schlauchs wird nach dem Kippen zur Höhe
  const upper: Key[] = [
    [-0.075, 0.018, 0.02], [-0.06, 0.034, 0.04], [0, 0.042, 0.046], [0.07, 0.046, 0.034],
    [0.13, 0.042, 0.026], [0.165, 0.026, 0.017], [0.176, 0.004, 0.004],
  ].map(([l, a, b]) => [l, a, b, 0.066 - b, 3] as Key);
  const sole: Key[] = upper.map(([l, a]) => [l, a + 0.004, 0.008, 0.063, 3] as Key);
  const lay = (g: THREE.BufferGeometry) => g.rotateX(Math.PI / 2);
  return merge([
    paint(lay(tube(upper, { rows: 12, segs: 14 })), { slot: 1, rough: 0.35 }),
    paint(lay(tube(sole, { rows: 12, segs: 14 })), { color: SOLE, rough: 0.9 }),
  ]);
}

/**
 * Rumpf: Trikot mit Nummernfläche, kompakte Schulterpolster, Kragen, Hals.
 * Die Polster ragen je Seite rund 5 cm über den Brustkorb – Schulterbreite ≈ 1,28 × Brustbreite.
 * Slots: A Trikot, B Zierfarbe, C Haut.
 */
function torso() {
  const n = 2.4;
  const keys: Key[] = [
    [JERSEY_Y[0], 0.146, 0.098, 0, n], [0.12, 0.148, 0.1, 0, n], [0.24, 0.162, 0.108, 0.004, n],
    [0.34, 0.176, 0.117, 0.008, n], [0.41, 0.178, 0.116, 0.006, n], [0.455, 0.172, 0.105, 0.002, n],
    [0.495, 0.13, 0.088, -0.004, n], [0.525, 0.082, 0.072, -0.006, n], [JERSEY_Y[1], 0.066, 0.064, -0.006, n],
  ];
  const pad = (s: 1 | -1) =>
    new THREE.SphereGeometry(1, 18, 12).scale(0.072, 0.05, 0.098).rotateZ(-s * 0.25).translate(s * 0.158, 0.462, -0.002);
  return merge([
    paint(tube(keys, { rows: 20, segs: 36 }), { slot: 1, ...CLOTH, numbers: true }),
    paint(pad(1), { slot: 1, ...CLOTH }),
    paint(pad(-1), { slot: 1, ...CLOTH }),
    paint(new THREE.TorusGeometry(0.07, 0.011, 8, 24).rotateX(Math.PI / 2).scale(1, 1, 0.95).translate(0, 0.54, -0.006), { slot: 2, ...CLOTH }),
    paint(new THREE.CylinderGeometry(0.056, 0.061, 0.09, 14, 1, true).translate(0, 0.57, -0.006), { slot: 3, ...SKIN }),
  ]);
}

/** Oberarm mit Ärmel und Ärmelbündchen. Slots: A Trikot, B Zierfarbe, C Haut. */
function upperArm() {
  const keys: Key[] = [
    [-0.3, 0.036, 0.038], [-0.29, 0.04, 0.042], [-0.2, 0.046, 0.05, 0.002], [-0.1, 0.05, 0.053],
    [-0.02, 0.052, 0.054], [0.03, 0.045, 0.046], [0.052, 0.012, 0.012],
  ];
  return merge([
    paint(tube(keys, { y0: -0.3, y1: -0.11, rows: 6, segs: 14 }), { slot: 3, ...SKIN }),
    paint(tube(keys, { y0: -0.125, y1: 0.052, rows: 7, segs: 14, inflate: 0.005 }), { slot: 1, ...CLOTH }),
    paint(tube(keys, { y0: -0.136, y1: -0.112, rows: 1, segs: 14, inflate: 0.0065 }), { slot: 2, ...CLOTH }),
  ]);
}

/** Unterarm mit Ellbogen, Tape am Handgelenk und Handschuh. Slots: A Haut, B Handschuh. */
function forearm() {
  const keys: Key[] = [
    [-0.26, 0.028, 0.026], [-0.2, 0.034, 0.032], [-0.08, 0.042, 0.042], [0, 0.04, 0.04], [0.02, 0.03, 0.03],
  ];
  return merge([
    paint(tube(keys, { rows: 8, segs: 14 }), { slot: 1, ...SKIN }),
    paint(ball([0.041, 0.041, 0.041], [0, 0, 0], 12, 8), { slot: 1, ...SKIN }),
    paint(tube(keys, { y0: -0.25, y1: -0.2, rows: 1, segs: 14, inflate: 0.003 }), { color: TAPE, rough: 0.8 }),
    paint(ball([0.03, 0.05, 0.021], [0, -0.3, 0.004], 12, 10), { slot: 2, rough: 0.5 }),
    paint(ball([0.011, 0.024, 0.012], [0, -0.287, 0.025], 8, 6), { slot: 2, rough: 0.5 }),
  ]);
}

/** Helm: Schale mit Gesichtsöffnung, dunkles Visier, Mittelstreifen, Facemask, Kinnschale. Slots: A Helm, B Streifen, C Facemask. */
function head() {
  const R = HELMET_R;
  const OPEN = 0.82; // halbe Gesichtsöffnung (rad)
  const BROW = 1.15; // Stirnkante (Polarwinkel)
  const ARC = 2.1; // Bogen der Facemask-Querstreben
  const shell = { slot: 1 as Slot, rough: 0.18, metal: 0.1 };
  const mask = { slot: 3 as Slot, rough: 0.35, metal: 0.45 };
  const MR = R * 1.1;

  const bar = (y: number, s: number) =>
    new THREE.TorusGeometry(MR * s, 0.0065, 6, 18, ARC).rotateX(Math.PI / 2).rotateY(ARC / 2 - Math.PI / 2).translate(0, y, 0);
  const post = (x: number) => {
    const z = (y: number, s: number) => Math.sqrt((MR * s) ** 2 - x * x) + y * 0;
    return rod(new THREE.Vector3(x, -0.028, z(0, 1)), new THREE.Vector3(x, -0.1, z(0, 0.93)), 0.0055);
  };
  const ear = (s: 1 | -1) =>
    new THREE.CircleGeometry(0.012, 12).rotateY((s * Math.PI) / 2).translate(s * Math.sqrt(R * R - 0.0004) * 1.006, -0.02, -0.005);

  const g = merge([
    paint(new THREE.SphereGeometry(R, 32, 12, 0, Math.PI * 2, 0, BROW), shell),
    paint(new THREE.SphereGeometry(R, 28, 10, Math.PI / 2 + OPEN, Math.PI * 2 - OPEN * 2, BROW, 1.2), shell),
    paint(new THREE.SphereGeometry(R * 0.94, 20, 14), { color: INNER, rough: 1 }),
    paint(new THREE.SphereGeometry(R * 0.972, 16, 8, Math.PI / 2 - OPEN - 0.05, OPEN * 2 + 0.1, BROW - 0.03, 0.62), { color: VISOR, rough: 0.08, metal: 0.5 }),
    paint(new THREE.TorusGeometry(R * 1.003, 0.0055, 4, 28, Math.PI - 0.42 + 0.5).rotateZ(-0.5).scale(1, 1, 3.6).rotateY(Math.PI / 2), { slot: 2, rough: 0.3 }),
    paint(bar(-0.028, 1), mask),
    paint(bar(-0.064, 0.97), mask),
    paint(bar(-0.1, 0.93), mask),
    paint(post(0.036), mask),
    paint(post(-0.036), mask),
    paint(rod(new THREE.Vector3(0, -0.028, MR), new THREE.Vector3(0, R * 0.42, R * 0.93), 0.0055), mask),
    paint(ball([0.03, 0.02, 0.022], [0, -0.116, 0.096], 12, 8), { color: TAPE, rough: 0.7 }),
    paint(ear(1), { color: INNER, rough: 1 }),
    paint(ear(-1), { color: INNER, rough: 1 }),
  ]);
  // Helm leicht schmaler und länger als eine Kugel
  g.scale(0.96, 1, 1.1).translate(...HELMET_CENTER);
  g.computeBoundingSphere();
  return g;
}

// ───────────────────────────────────────────────── Zugriff

export type GeoName = 'pelvis' | 'thighL' | 'thighR' | 'shin' | 'foot' | 'torso' | 'upperArm' | 'forearm' | 'head';

let cache: Record<GeoName, THREE.BufferGeometry> | null = null;

/** Die gemeinsamen Geometrien – werden beim ersten Zugriff genau einmal erzeugt. */
export function playerGeometries(): Record<GeoName, THREE.BufferGeometry> {
  cache ??= {
    pelvis: pelvis(),
    thighL: thigh(-1),
    thighR: thigh(1),
    shin: shin(),
    foot: foot(),
    torso: torso(),
    upperArm: upperArm(),
    forearm: forearm(),
    head: head(),
  };
  return cache;
}

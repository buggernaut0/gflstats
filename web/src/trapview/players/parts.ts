import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Das eine Spielermodell: 13 starre Körperteile, jedes als EINE zusammengeführte Geometrie.
 * Proportionen ändern: die Querschnittslisten (`keys`) der Körperteile weiter unten – je Zeile eine Höhe mit
 * Breite, Tiefe vorn und Tiefe hinten. Farben kommen aus dem Kit (data/kits.ts), Körperbau aus rig.ts (BUILD).
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
export const JERSEY_Y: [number, number] = [0.06, 0.56];

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

/**
 * Querschnitt an einer Stelle des Profils:
 * [y, halbe Breite (x), Tiefe nach vorn (+z), Tiefe nach hinten (−z), Kantigkeit (2 = Ellipse), z-Versatz].
 * Getrennte Tiefen für vorn und hinten erlauben Brust, Lendenkrümmung, Gesäß und Wade.
 */
type Key = [y: number, w: number, f: number, b: number, n?: number, c?: number];
type Section = [y: number, w: number, f: number, b: number, n: number, c: number];

/** Glatte Kurve (Catmull-Rom) durch alle Querschnitte; t zählt die Querschnitte (0 … keys.length − 1). */
function section(keys: Key[], t: number): Section {
  const last = keys.length - 1;
  const i = Math.min(Math.max(Math.floor(t), 0), last - 1);
  const s = t - i;
  const at = (k: number, j: number, d: number) => keys[Math.min(Math.max(k, 0), last)][j] ?? d;
  const cr = (j: number, d: number) => {
    const p0 = at(i - 1, j, d);
    const p1 = at(i, j, d);
    const p2 = at(i + 1, j, d);
    const p3 = at(i + 2, j, d);
    return 0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (3 * p1 - p0 - 3 * p2 + p3) * s * s * s);
  };
  // y bleibt linear zwischen den Querschnitten, damit Höhenangaben exakt getroffen werden
  const y = at(i, 0, 0) + (at(i + 1, 0, 0) - at(i, 0, 0)) * s;
  return [y, Math.max(cr(1, 0), 0), Math.max(cr(2, 0), 0), Math.max(cr(3, 0), 0), Math.max(cr(4, 2), 1.6), cr(5, 0)];
}

/** Profil-Parameter t zu einer Höhe y (y wächst mit t). */
function tAt(keys: Key[], y: number): number {
  for (let i = 0; i < keys.length - 1; i++) {
    if (y <= keys[i + 1][0]) return i + Math.min(Math.max((y - keys[i][0]) / (keys[i + 1][0] - keys[i][0]), 0), 1);
  }
  return keys.length - 1;
}

interface TubeOpts {
  /** Ausschnitt des Profils als Höhenbereich (Standard: ganze Höhe) */
  y0?: number;
  y1?: number;
  /** Reihen über den Ausschnitt (Standard: 2 je Querschnittsabstand) */
  rows?: number;
  segs?: number;
  /** Ausschnitt des Umfangs, 0–1 (0 = Naht bei +X, 0.25 hinten, 0.5 bei −X, 0.75 vorn) */
  arc?: [number, number];
  /** Aufdickung in Metern – für Stoffschichten und Streifen, die auf dem Körper liegen */
  inflate?: number;
  /** Zusätzliche Wölbung in der Mitte des Ausschnitts, läuft zu den Rändern auf 0 aus (Pads) */
  bulge?: number;
  /** Runde Kappe am unteren bzw. oberen Ende (Höhe in Metern) – macht das Ende zur Gelenkkugel */
  capBottom?: number;
  capTop?: number;
  /** Reihen je Kappe (Standard 6) */
  capRows?: number;
  /**
   * Nummern-Koordinaten nach Bogenlänge: `center` ist die Atlas-Spalte der Flächenmitte (0.75 Brust, 0.25 Rücken),
   * `perU` die Meter je Atlas-Breite. So bleiben Ziffern auf der gekrümmten Fläche unverzerrt.
   */
  num?: { center: number; perU: number };
  /**
   * Ausschnitt auf ein Rechteck des Nummern-Atlas legen (Schulternummern): Atlas-u läuft entlang der Höhe des
   * Ausschnitts, Atlas-v entlang des Umfangs; `flipU`/`flipV` drehen die jeweilige Richtung um (je Körperseite verschieden).
   */
  rect?: { at: [number, number, number, number]; flipU: boolean; flipV: boolean };
}

/**
 * Schlauch entlang +Y mit frei geformten Querschnitten (Superellipse, vorn und hinten getrennt). Grundform für
 * Rumpf, Gliedmaßen und Schuhe sowie – als Ausschnitt mit `inflate`/`bulge` – für Ärmel, Streifen und Pads.
 *
 * Orientierung: u läuft – von außen betrachtet – gegen den Uhrzeigersinn um die Hochachse, sodass
 * (∂P/∂u, ∂P/∂v) zusammen mit der Außennormalen ein Rechtssystem bilden. Nur dann erscheint eine
 * Textur von außen seitenrichtig (u wächst nach rechts, v nach oben) – an Brust wie Rücken.
 * Die Dreiecke sind passend dazu gegen den Uhrzeigersinn (Normale nach außen) gewickelt.
 */
function tube(keys: Key[], o: TubeOpts = {}): THREE.BufferGeometry {
  const t0 = o.y0 === undefined ? 0 : tAt(keys, o.y0);
  const t1 = o.y1 === undefined ? keys.length - 1 : tAt(keys, o.y1);
  const rows = o.rows ?? Math.max(1, Math.round((t1 - t0) * 2));
  const segs = o.segs ?? 20;
  const [u0, u1] = o.arc ?? [0, 1];
  const pw = (v: number, n: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);
  const CAP = o.capRows ?? 6;

  // Reihen von unten nach oben: [Querschnitt, Skalierung, Anteil 0–1 über den Ausschnitt]
  const list: [Section, number, number][] = [];
  const end0 = section(keys, t0);
  const end1 = section(keys, t1);
  if (o.capBottom) {
    for (let k = CAP; k >= 1; k--) {
      const a = (k / CAP) * (Math.PI / 2);
      list.push([[end0[0] - o.capBottom * Math.sin(a), end0[1], end0[2], end0[3], end0[4], end0[5]], Math.cos(a), 0]);
    }
  }
  for (let i = 0; i <= rows; i++) list.push([section(keys, t0 + ((t1 - t0) * i) / rows), 1, i / rows]);
  if (o.capTop) {
    for (let k = 1; k <= CAP; k++) {
      const a = (k / CAP) * (Math.PI / 2);
      list.push([[end1[0] + o.capTop * Math.sin(a), end1[1], end1[2], end1[3], end1[4], end1[5]], Math.cos(a), 1]);
    }
  }

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const w = segs + 1;
  const jc = segs / 2;
  for (const [[y, a, f, b, n, c], k, v] of list) {
    const rowStart = pos.length / 3;
    for (let j = 0; j <= segs; j++) {
      const frac = j / segs;
      const u = u0 + (u1 - u0) * frac;
      const phi = -Math.PI * 2 * u;
      const sn = Math.sin(phi);
      const inf = (o.inflate ?? 0) + (o.bulge ? o.bulge * Math.pow(Math.max(Math.sin(Math.PI * v) * Math.sin(Math.PI * frac), 0), 0.55) : 0);
      pos.push(k * (a + inf) * pw(Math.cos(phi), n), y, c + k * ((sn >= 0 ? f : b) + inf) * pw(sn, n));
      if (o.rect) {
        const [ru0, rv0, ru1, rv1] = o.rect.at;
        const a = o.rect.flipU ? 1 - v : v;
        const b = o.rect.flipV ? 1 - frac : frac;
        uv.push(ru0 + (ru1 - ru0) * a, rv0 + (rv1 - rv0) * b);
      }
      else uv.push(u, 0);
    }
    if (o.num) {
      // Bogenlänge ab der Mittelspalte, gemessen am Netz selbst
      const P = (j: number) => new THREE.Vector3().fromArray(pos, (rowStart + j) * 3);
      const vv = THREE.MathUtils.clamp((y - JERSEY_Y[0]) / (JERSEY_Y[1] - JERSEY_Y[0]), 0, 1);
      let s = 0;
      uv[(rowStart + jc) * 2] = o.num.center;
      uv[(rowStart + jc) * 2 + 1] = vv;
      for (let j = jc + 1; j <= segs; j++) {
        s += P(j).distanceTo(P(j - 1));
        uv[(rowStart + j) * 2] = o.num.center + s / o.num.perU;
        uv[(rowStart + j) * 2 + 1] = vv;
      }
      s = 0;
      for (let j = jc - 1; j >= 0; j--) {
        s += P(j).distanceTo(P(j + 1));
        uv[(rowStart + j) * 2] = o.num.center - s / o.num.perU;
        uv[(rowStart + j) * 2 + 1] = vv;
      }
    }
  }
  for (let i = 0; i < list.length - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * w + j;
      const b = a + 1;
      const c = a + w;
      const d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * Glättet die Normalen über Nähte hinweg: Punkte an derselben Stelle (Schlauchnaht, Kappenspitze, Grenze
 * zwischen zwei Farbabschnitten desselben Profils) bekommen dieselbe Normale – keine sichtbare Kante.
 */
function weld(list: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
  const sum = new Map<string, [number, number, number]>();
  const key = (p: THREE.BufferAttribute, i: number) =>
    `${Math.round(p.getX(i) * 2e4)},${Math.round(p.getY(i) * 2e4)},${Math.round(p.getZ(i) * 2e4)}`;
  for (const g of list) {
    g.computeVertexNormals();
    const p = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const k = key(p, i);
      const a = sum.get(k) ?? [0, 0, 0];
      a[0] += nor.getX(i);
      a[1] += nor.getY(i);
      a[2] += nor.getZ(i);
      sum.set(k, a);
    }
  }
  const v = new THREE.Vector3();
  for (const g of list) {
    const p = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      v.fromArray(sum.get(key(p, i))!).normalize();
      nor.setXYZ(i, v.x, v.y, v.z);
    }
  }
  return list;
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
//
// Jedes Gelenk ist eine Kugel in einer Pfanne: Das Ende eines Teils ist eine runde Kappe (capTop/capBottom),
// die im Nachbarteil steckt. So bleibt der Übergang in jeder Haltung geschlossen und glatt.
// Mehrere Farbabschnitte desselben Profils teilen sich die Normalen (weld) – ohne sichtbare Kante.

/** Ein Profil in Farbabschnitten: jeder Abschnitt ist ein Stück desselben Schlauchs, die Normalen laufen durch. */
function skin(keys: Key[], segs: number, bands: (TubeOpts & { paint: Paint })[]): THREE.BufferGeometry[] {
  const tubes = weld(bands.map(({ paint: _p, ...o }) => tube(keys, { segs, ...o })));
  return tubes.map((g, i) => paint(g, bands[i].paint));
}

/** Ein aufliegendes Stück (Streifen, Bündchen, Pad) – eigene Normalen. */
function layer(keys: Key[], o: TubeOpts, p: Paint): THREE.BufferGeometry {
  return paint(weld([tube(keys, o)])[0], p);
}

/**
 * Becken: Football-Hose vom Schritt bis zum Bund, als geschlossener Körper. Seitenlinie von hinten:
 * Gesäß (am weitesten hinten) → Hüfte → Bund – darüber setzt der Rumpf mit der Lendenkrümmung an.
 * Das Trikot steckt in der Hose: Der Rumpf taucht von oben in das Becken ein. Slots: A Hose.
 */
function pelvis() {
  // Bewusst schmaler als die Hüftkugeln der Oberschenkel: Diese treten seitlich klar hervor (saubere Schnittkante)
  const keys: Key[] = [
    [-0.132, 0.055, 0.05, 0.056, 2.2], [-0.112, 0.105, 0.08, 0.09, 2.3], [-0.085, 0.14, 0.095, 0.11, 2.4],
    [-0.05, 0.15, 0.1, 0.116, 2.4], [-0.015, 0.151, 0.101, 0.114, 2.4], [0.02, 0.151, 0.101, 0.109, 2.4],
    [0.055, 0.152, 0.1, 0.106, 2.4], [0.076, 0.152, 0.099, 0.105, 2.4],
  ];
  return merge([
    ...skin(keys, 28, [{ capRows: 4, capBottom: 0.014, capTop: 0.022, paint: { slot: 1, ...STRETCH } }]),
    layer(keys, { y0: 0.046, y1: 0.074, rows: 2, segs: 28, inflate: 0.003 }, { color: BELT, rough: 0.5 }),
  ]);
}

/** Oberschenkel: Hüftkugel, Quadrizeps, angedeutetes Oberschenkelpad, Seitenstreifen. Slots: A Hose, B Zierfarbe. */
function thigh(side: 1 | -1) {
  const keys: Key[] = [
    [-0.44, 0.052, 0.054, 0.052], [-0.4, 0.058, 0.063, 0.058], [-0.3, 0.076, 0.083, 0.076],
    [-0.18, 0.088, 0.097, 0.092], [-0.09, 0.09, 0.099, 0.1], [-0.04, 0.089, 0.096, 0.098], [0, 0.086, 0.09, 0.094],
  ];
  // Streifen jeweils außen: u = 0 liegt bei +X, u = 0.5 bei −X
  const arc: [number, number] = side === 1 ? [-0.028, 0.028] : [0.472, 0.528];
  return merge([
    ...skin(keys, 22, [{ capBottom: 0.046, capTop: 0.08, paint: { slot: 1, ...STRETCH } }]),
    layer(keys, { y0: -0.43, y1: -0.04, rows: 10, segs: 3, arc, inflate: 0.0015 }, { slot: 2, ...STRETCH }),
    layer(keys, { y0: -0.34, y1: -0.12, rows: 8, segs: 8, arc: [0.64, 0.86], inflate: 0.0006, bulge: 0.008 }, { slot: 1, ...STRETCH }),
  ]);
}

/** Unterschenkel: Kniekugel (zugleich das Kniepad), Hosenbein mit Bündchen, Wade, Stutzen mit zwei Streifen, getapter Knöchel. Slots: A Stutzen, B Hose, C Zierfarbe. */
function shin() {
  const keys: Key[] = [
    [-0.44, 0.037, 0.04, 0.04], [-0.4, 0.036, 0.039, 0.04], [-0.32, 0.04, 0.041, 0.047], [-0.22, 0.05, 0.046, 0.066],
    [-0.13, 0.056, 0.05, 0.074], [-0.055, 0.06, 0.061, 0.065], [0, 0.07, 0.073, 0.069],
  ];
  return merge([
    ...skin(keys, 20, [
      { y1: -0.35, capBottom: 0.038, paint: { color: TAPE, rough: 0.8 } },
      { y0: -0.35, y1: -0.08, paint: { slot: 1, ...KNIT } },
      { y0: -0.08, capTop: 0.07, paint: { slot: 2, ...STRETCH } },
    ]),
    layer(keys, { y0: -0.094, y1: -0.076, rows: 1, segs: 20, inflate: 0.003 }, { slot: 3, ...STRETCH }),
    layer(keys, { y0: -0.135, y1: -0.117, rows: 1, segs: 20, inflate: 0.0015 }, { slot: 3, ...KNIT }),
    layer(keys, { y0: -0.168, y1: -0.15, rows: 1, segs: 20, inflate: 0.0015 }, { slot: 3, ...KNIT }),
  ]);
}

/**
 * Football-Cleat entlang +Z; das Sprunggelenk sitzt im Ursprung, der Boden bei y = −FOOT.
 * Schaft mit Fersenkappe und Zehenbox, Zunge mit Schnürung, gepolsterter Kragen ums Gelenk,
 * Sohlenplatte in der Zierfarbe, sieben Stollen.
 * Slots: A Schuh, B Zierfarbe.
 */
function foot() {
  const SOLE_TOP = -0.05;
  // [Länge, halbe Breite, Oberkante (y)] von der Ferse bis zur Spitze
  const shape: [number, number, number][] = [
    [-0.074, 0.03, 0.01], [-0.045, 0.038, 0.016], [0, 0.043, 0.015], [0.04, 0.045, 0.007],
    [0.082, 0.048, -0.005], [0.124, 0.047, -0.015], [0.156, 0.039, -0.022],
  ];
  // Der Schlauch läuft entlang der Schuhlänge und wird danach gekippt: „vorn“ zeigt dann nach unten, „hinten“ nach oben
  const upper: Key[] = shape.map(([l, w, top]) => {
    const mid = (top + SOLE_TOP) / 2;
    return [l, w, mid - SOLE_TOP, top - mid, 2.7, -mid] as Key;
  });
  const sole: Key[] = shape.map(([l, w]) => [l, w + 0.004, 0.006, 0.006, 4, 0.054] as Key);
  const lay = (g: THREE.BufferGeometry) => g.rotateX(Math.PI / 2);
  const TOP: [number, number] = [0.18, 0.32]; // Oberseite des Schuhs (nach dem Kippen)
  const lace = (l: number) =>
    lay(layer(upper, { y0: l, y1: l + 0.007, rows: 1, segs: 4, arc: [0.2, 0.3], inflate: 0.0085 }, { color: TAPE, rough: 0.8 }));
  const stud = (x: number, z: number) =>
    paint(new THREE.CylinderGeometry(0.0085, 0.006, 0.012, 6).translate(x, -FOOT + 0.006, z), { color: SOLE, rough: 0.6 });
  const collar = new THREE.TorusGeometry(0.041, 0.006, 5, 14).rotateX(Math.PI / 2).scale(1, 1, 1.1).translate(0, 0.017, -0.004);
  return merge([
    ...skin(upper, 14, [{ capRows: 3, capBottom: 0.012, capTop: 0.022, paint: { slot: 1, rough: 0.38 } }]).map(lay),
    // Zunge mit Schnürung
    lay(layer(upper, { y0: 0.022, y1: 0.105, rows: 6, segs: 6, arc: TOP, inflate: 0.0006, bulge: 0.007 }, { slot: 1, rough: 0.5 })),
    lace(0.04), lace(0.056), lace(0.072), lace(0.088),
    ...skin(sole, 12, [{ rows: 6, capRows: 3, capBottom: 0.012, capTop: 0.022, paint: { slot: 2, rough: 0.5 } }]).map(lay),
    paint(collar, { slot: 1, rough: 0.6 }),
    stud(0.026, 0.116), stud(-0.026, 0.116), stud(0.03, 0.076), stud(-0.03, 0.076), stud(0, 0.146),
    stud(0.02, -0.045), stud(-0.02, -0.045),
  ]);
}

/** Meter je Breite einer Nummern-Kachel (siehe numberAtlas.ts). */
export const NUM_PER_U = 1.4;
/** Rechteck der Kachel für die Schulternummer – liegt in dem Streifen, den Brust und Rücken frei lassen. */
export const SHOULDER_RECT: [number, number, number, number] = [0.44, 0.04, 0.56, 0.46];

/**
 * Rumpf: Trikot über Shoulder Pads. Die Pads sind kein aufgesetztes Teil, sondern die Form des Trikots selbst:
 * Brustplatte, breites gewölbtes Joch mit Überstand über dem Oberarm, flach zum Kragen ansteigend.
 * Unten taucht der Rumpf in die Hose ein. Brust und Rücken tragen die Nummer, die Schultern eine kleine dazu.
 * Slots: A Trikot, B Zierfarbe, C Haut.
 */
function torso() {
  const keys: Key[] = [
    [-0.03, 0.146, 0.092, 0.098, 2.4], [0.04, 0.148, 0.094, 0.101, 2.4], [0.1, 0.147, 0.096, 0.099, 2.4],
    [0.17, 0.152, 0.102, 0.098, 2.4], [0.25, 0.165, 0.112, 0.106, 2.4], [0.32, 0.18, 0.124, 0.116, 2.5],
    [0.375, 0.212, 0.131, 0.121, 2.8], [0.415, 0.25, 0.125, 0.119, 3.2], [0.45, 0.262, 0.115, 0.113, 3.4],
    [0.482, 0.25, 0.106, 0.106, 3.4], [0.503, 0.19, 0.096, 0.099, 3], [0.522, 0.125, 0.084, 0.089, 2.6],
    [0.54, 0.082, 0.07, 0.074, 2.3], [0.556, 0.07, 0.064, 0.066, 2.2],
  ];
  const jersey = { slot: 1 as Slot, ...CLOTH, numbers: true };
  // Von vorn lesbar: Ziffern laufen zur +X-Seite, die Oberkante zeigt nach hinten
  const shoulderNumber = (arc: [number, number], flipU: boolean, flipV: boolean) =>
    layer(keys, { y0: 0.485, y1: 0.514, rows: 5, segs: 6, arc, inflate: 0.0012, rect: { at: SHOULDER_RECT, flipU, flipV } }, jersey);
  return merge([
    ...skin(keys, 20, [
      { arc: [0, 0.5], num: { center: 0.25, perU: NUM_PER_U }, paint: jersey },
      { arc: [0.5, 1], num: { center: 0.75, perU: NUM_PER_U }, paint: jersey },
    ]),
    shoulderNumber([-0.07, 0.07], true, false),
    shoulderNumber([0.43, 0.57], false, true),
    layer(keys, { y0: 0.538, y1: 0.556, rows: 1, segs: 24, inflate: 0.003 }, { slot: 2, ...CLOTH }),
    paint(new THREE.CylinderGeometry(0.055, 0.06, 0.08, 16, 1, true).translate(0, 0.585, -0.004), { slot: 3, ...SKIN }),
  ]);
}

/** Oberarm: Schulterkugel (steckt unter dem Pad), Ärmel mit Bündchen, Bizeps, Ellbogenkugel. Slots: A Trikot, B Zierfarbe, C Haut. */
function upperArm() {
  const keys: Key[] = [
    [-0.29, 0.043, 0.044, 0.044], [-0.26, 0.042, 0.043, 0.044], [-0.2, 0.046, 0.05, 0.048], [-0.13, 0.052, 0.056, 0.054],
    [-0.06, 0.055, 0.058, 0.057], [0, 0.054, 0.056, 0.056],
  ];
  return merge([
    ...skin(keys, 20, [{ y1: -0.11, capBottom: 0.043, paint: { slot: 3, ...SKIN } }]),
    ...skin(keys, 20, [{ y0: -0.125, capTop: 0.054, inflate: 0.004, paint: { slot: 1, ...CLOTH } }]),
    layer(keys, { y0: -0.14, y1: -0.118, rows: 1, segs: 20, inflate: 0.0055 }, { slot: 2, ...CLOTH }),
  ]);
}

/** Unterarm: Ellbogenkugel, Tape am Handgelenk, Handschuh (Handfläche zeigt zum Körper). Slots: A Haut, B Handschuh. */
function forearm() {
  const arm: Key[] = [
    [-0.25, 0.027, 0.025, 0.025], [-0.235, 0.028, 0.026, 0.026], [-0.16, 0.035, 0.034, 0.034],
    [-0.09, 0.0415, 0.0425, 0.0415], [-0.04, 0.0375, 0.0385, 0.038], [0, 0.035, 0.036, 0.036],
  ];
  const hand: Key[] = [
    [-0.348, 0.014, 0.03, 0.024, 2.4, 0.01], [-0.318, 0.017, 0.04, 0.03, 2.6, 0.007], [-0.28, 0.018, 0.04, 0.033, 2.6, 0.004],
    [-0.245, 0.024, 0.027, 0.027, 2.2, 0],
  ];
  return merge([
    ...skin(arm, 20, [{ capTop: 0.035, paint: { slot: 1, ...SKIN } }]),
    layer(arm, { y0: -0.25, y1: -0.205, rows: 2, segs: 20, inflate: 0.0025 }, { color: TAPE, rough: 0.8 }),
    ...skin(hand, 12, [{ capRows: 3, capBottom: 0.016, paint: { slot: 2, rough: 0.5 } }]),
    paint(ball([0.011, 0.027, 0.012], [0, -0.29, 0.043], 8, 6), { slot: 2, rough: 0.5 }),
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
    paint(ball([0.026, 0.016, 0.018], [0, -0.1, 0.088], 12, 8), { color: TAPE, rough: 0.7 }),
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

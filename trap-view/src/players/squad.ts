import * as THREE from 'three';
import type { SceneModel, ScenePlayer } from '../data/sceneModel';
import type { Kit } from '../data/kits';
import { playerGeometries, type GeoName } from './parts';
import { createPlayerMaterial } from './playerMaterial';
import { createNumberAtlas } from './numberAtlas';
import { animateRig, buildRig, PART_NAMES, type PartName, type Rig } from './rig';

const GEO_OF: Record<PartName, GeoName> = {
  pelvis: 'pelvis', thighL: 'thighL', thighR: 'thighR', shinL: 'shin', shinR: 'shin', footL: 'foot', footR: 'foot',
  torso: 'torso', upperArmL: 'upperArm', upperArmR: 'upperArm', forearmL: 'forearm', forearmR: 'forearm', head: 'head',
};

/** Welche drei Farben (Slots A, B, C in parts.ts) ein Spieler je Körperteil mitbringt. */
const PALETTE: Record<GeoName, (k: Kit, skin: string) => [string, string, string]> = {
  pelvis: (k) => [k.pants, k.trim, k.trim],
  thighL: (k) => [k.pants, k.trim, k.trim],
  thighR: (k) => [k.pants, k.trim, k.trim],
  shin: (k) => [k.socks, k.pants, k.trim],
  foot: (k) => [k.shoes, k.trim, k.trim],
  torso: (k, skin) => [k.jersey, k.trim, skin],
  upperArm: (k, skin) => [k.jersey, k.trim, skin],
  forearm: (k, skin) => [skin, k.gloves, k.trim],
  head: (k) => [k.helmet, k.helmetStripe, k.facemask],
};

const SKIN_TONES = ['#c99572', '#8a5a3c', '#e0b08c', '#5f3d28'];

/** Stabiler Wert je Spieler – bestimmt Hautton und Atemtakt, unabhängig von der Reihenfolge. */
function seedOf(p: ScenePlayer): number {
  const key = p.player?.id ?? p.id;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 9973;
}

export interface Squad {
  group: THREE.Group;
  /** Idle-Bewegung fortschreiben (t in Sekunden). */
  update: (t: number) => void;
  dispose: () => void;
}

/**
 * Alle Spieler der Partie als instanzierte Körperteile: 13 InstancedMeshes für sämtliche belegten
 * Plätze (plus 13 für unbesetzte Plätze, falls es welche gibt). Geometrien sind für alle Spieler
 * dieselben; Teamfarben, Hautton und Nummern-Kachel hängen als Instanz-Attribute an jedem Spieler.
 */
export function createSquad(model: SceneModel): Squad {
  const geo = playerGeometries();
  const group = new THREE.Group();
  const owned: { dispose: () => void }[] = [];
  const sets: { rigs: Rig[]; meshes: THREE.InstancedMesh[] }[] = [];
  const m4 = new THREE.Matrix4();
  const color = new THREE.Color();

  const write = (set: { rigs: Rig[]; meshes: THREE.InstancedMesh[] }) => {
    set.meshes.forEach((mesh, pi) => {
      const name = PART_NAMES[pi];
      set.rigs.forEach((rig, i) => mesh.setMatrixAt(i, m4.copy(rig.nodes[name].matrixWorld)));
      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  const filled = model.players.filter((p) => p.player);
  const empty = model.players.filter((p) => !p.player);

  if (filled.length) {
    const atlas = createNumberAtlas(filled.map((p) => ({ number: p.player!.number, name: p.shortName })));
    const body = createPlayerMaterial();
    const jersey = createPlayerMaterial({ numbers: atlas });
    const helmet = createPlayerMaterial({ gloss: true });
    owned.push(atlas.texture, body, jersey, helmet);

    const seeds = filled.map(seedOf);
    const rigs = filled.map((p, i) => buildRig({ world: p.world, rotationY: p.rotationY, stance: p.slot.stance, build: p.slot.build }, seeds[i]));
    const n = filled.length;

    /** Je Spieler ein Farbwert als Instanz-Attribut. */
    const perPlayer = (pick: (p: ScenePlayer, i: number) => string) => {
      const a = new Float32Array(n * 3);
      filled.forEach((p, i) => color.set(pick(p, i)).toArray(a, i * 3));
      return new THREE.InstancedBufferAttribute(a, 3);
    };

    const meshes = PART_NAMES.map((name) => {
      const src = geo[GEO_OF[name]];
      // Eigene Hülle je Mesh: teilt Vertex-Daten mit allen anderen, trägt aber eigene Instanz-Attribute
      const g = new THREE.BufferGeometry();
      g.setIndex(src.index);
      for (const k of Object.keys(src.attributes)) g.setAttribute(k, src.attributes[k]);
      const palette = PALETTE[GEO_OF[name]];
      (['iA', 'iB', 'iC'] as const).forEach((attr, slot) => {
        g.setAttribute(attr, perPlayer((p, i) => palette(p.kit, SKIN_TONES[seeds[i] % SKIN_TONES.length])[slot]));
      });
      if (name === 'torso') {
        g.setAttribute('iNum', perPlayer((p) => p.kit.number));
        g.setAttribute('iOutline', perPlayer((p) => p.kit.numberOutline));
        const tiles = new Float32Array(n * 2);
        filled.forEach((_, i) => tiles.set(atlas.tile(i), i * 2));
        g.setAttribute('iTile', new THREE.InstancedBufferAttribute(tiles, 2));
      }
      owned.push(g);
      const mesh = new THREE.InstancedMesh(g, name === 'torso' ? jersey : name === 'head' ? helmet : body, n);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Instanzen stehen über das ganze Feld verteilt und bewegen sich – ein Culling je Mesh lohnt nicht
      mesh.frustumCulled = false;
      group.add(mesh);
      return mesh;
    });
    const set = { rigs, meshes };
    write(set);
    sets.push(set);
  }

  if (empty.length) {
    // Unbesetzter Platz: farblose, durchscheinende Silhouette – es wird kein Spieler erfunden
    const ghost = new THREE.MeshStandardMaterial({ color: '#9aa4b2', roughness: 0.9, transparent: true, opacity: 0.16, depthWrite: false });
    owned.push(ghost);
    const rigs = empty.map((p) => buildRig({ world: p.world, rotationY: p.rotationY, stance: p.slot.stance, build: p.slot.build }, seedOf(p)));
    const meshes = PART_NAMES.map((name) => {
      const mesh = new THREE.InstancedMesh(geo[GEO_OF[name]], ghost, empty.length);
      mesh.frustumCulled = false;
      group.add(mesh);
      return mesh;
    });
    write({ rigs, meshes });
  }

  return {
    group,
    update: (t) => {
      for (const set of sets) {
        for (const rig of set.rigs) animateRig(rig, t);
        write(set);
      }
    },
    dispose: () => {
      group.children.forEach((c) => (c as THREE.InstancedMesh).dispose());
      owned.forEach((o) => o.dispose());
    },
  };
}

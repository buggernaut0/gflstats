import * as THREE from 'three';
import type { Kit } from '../data/kits';
import type { ModelStyle } from './styles';

/**
 * Stoffstruktur als Bump-Map, einmal erzeugt und von allen Spielern geteilt:
 *  - "mesh": Lochgewebe eines Football-Trikots,
 *  - "knit": feine Längsrippen für Stretch-Hose und Socken.
 * Wirkt nur im Streiflicht und in Nahaufnahmen – auf Distanz glättet das Mipmapping.
 */
function fabricTexture(kind: 'mesh' | 'knit', repeat: [number, number]): THREE.CanvasTexture {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);
  if (kind === 'mesh') {
    ctx.fillStyle = '#3a3a3a';
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.beginPath();
        ctx.arc(8 + x * 16 + (y % 2) * 8, 8 + y * 16, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    for (let x = 0; x < S; x += 4) {
      ctx.fillStyle = x % 8 ? '#9a9a9a' : '#5c5c5c';
      ctx.fillRect(x, 0, 2, S);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}

export const FABRIC = {
  /** Torso: u einmal um den Körper, v Taille → Kragen */
  jerseyTorso: fabricTexture('mesh', [44, 14]),
  /** Ärmel, Schulterpolster (Kugel-/Rotationskörper-UVs) */
  jerseyParts: fabricTexture('mesh', [14, 8]),
  knit: fabricTexture('knit', [10, 4]),
};

/** Materialien, die sich alle Spieler eines Teams teilen. */
export interface KitMaterials {
  jersey: THREE.MeshStandardMaterial;
  pants: THREE.MeshStandardMaterial;
  socks: THREE.MeshStandardMaterial;
  helmet: THREE.MeshPhysicalMaterial;
  stripe: THREE.MeshStandardMaterial;
  /** Zierstreifen an Ärmeln, Kragen, Hose und Socken */
  trim: THREE.MeshStandardMaterial;
  facemask: THREE.MeshStandardMaterial;
}

/** Glanzfarbe aus der Stofffarbe abgeleitet – weißer Sheen würde dunkle Teamfarben grau auswaschen. */
export const sheenOf = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), 0.35);

export function createKitMaterials(kit: Kit): KitMaterials {
  return {
    // Trikotstoff: leichter Glanz an den Kanten (Sheen) und Lochgewebe
    jersey: new THREE.MeshPhysicalMaterial({
      color: kit.jersey, roughness: 0.68, sheen: 0.3, sheenRoughness: 0.6, sheenColor: sheenOf(kit.jersey),
      bumpMap: FABRIC.jerseyParts, bumpScale: 0.35,
    }),
    // Stretch-Hose: glatter, deutlich glänzender als das Trikot
    pants: new THREE.MeshPhysicalMaterial({
      color: kit.pants, roughness: 0.42, sheen: 0.5, sheenRoughness: 0.4, sheenColor: sheenOf(kit.pants),
      clearcoat: 0.15, clearcoatRoughness: 0.5, bumpMap: FABRIC.knit, bumpScale: 0.25,
    }),
    socks: new THREE.MeshStandardMaterial({ color: kit.socks, roughness: 0.85, bumpMap: FABRIC.knit, bumpScale: 0.5 }),
    helmet: new THREE.MeshPhysicalMaterial({
      color: kit.helmet, roughness: 0.2, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.06,
      envMapIntensity: 2.4,
    }),
    stripe: new THREE.MeshStandardMaterial({ color: kit.helmetStripe, roughness: 0.35 }),
    trim: new THREE.MeshPhysicalMaterial({ color: kit.trim, roughness: 0.55, sheen: 0.3, sheenColor: sheenOf(kit.trim) }),
    // Pulverbeschichtetes Gitter: matter als blankes Metall
    facemask: new THREE.MeshPhysicalMaterial({ color: kit.facemask, roughness: 0.32, metalness: 0.35, clearcoat: 0.4 }),
  };
}

export function disposeKitMaterials(m: KitMaterials) {
  Object.values(m).forEach((mat) => mat.dispose());
}

/** Teamunabhängige Materialien. */
export const SHARED = {
  skin: ['#c99572', '#8a5a3c', '#e0b08c', '#5f3d28'].map(
    (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.52, sheen: 0.25, sheenColor: '#ffd9c2', sheenRoughness: 0.6 }),
  ),
  glove: new THREE.MeshPhysicalMaterial({ color: '#16171a', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.4 }),
  shoe: new THREE.MeshPhysicalMaterial({ color: '#0e0f12', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
  sole: new THREE.MeshStandardMaterial({ color: '#1d1f23', roughness: 0.85 }),
  /** Tape, Spats, Schweißbänder, Kinnschale */
  tape: new THREE.MeshStandardMaterial({ color: '#eceef0', roughness: 0.75 }),
  belt: new THREE.MeshStandardMaterial({ color: '#0f1012', roughness: 0.5 }),
  inner: new THREE.MeshStandardMaterial({ color: '#050506', roughness: 1 }),
  visor: new THREE.MeshPhysicalMaterial({
    color: '#0a0c11', roughness: 0.06, metalness: 0.45, clearcoat: 1, envMapIntensity: 2.6,
  }),
};

/**
 * Unbesetzter Platz der Formation: halbtransparente, farblose Silhouette. Zeigt, dass die Daten
 * für diesen Platz keinen Spieler belegen – statt einen Spieler zu erfinden.
 */
export const GHOST = new THREE.MeshStandardMaterial({
  color: '#9aa4b2', roughness: 0.9, transparent: true, opacity: 0.16, depthWrite: false,
});
export const GHOST_KIT: KitMaterials = {
  jersey: GHOST, pants: GHOST, socks: GHOST, stripe: GHOST, trim: GHOST, facemask: GHOST,
  helmet: GHOST as unknown as THREE.MeshPhysicalMaterial,
};
export const GHOST_SHARED: Omit<typeof SHARED, 'skin'> = {
  glove: GHOST as unknown as THREE.MeshPhysicalMaterial,
  shoe: GHOST as unknown as THREE.MeshPhysicalMaterial,
  sole: GHOST, tape: GHOST, belt: GHOST, inner: GHOST,
  visor: GHOST as unknown as THREE.MeshPhysicalMaterial,
};

// ─────────────────────────────────────────────────────────── Stile

export type SharedSet = Omit<typeof SHARED, 'skin'>;

/** Alle Materialien eines Teams in einem Darstellungsstil. */
export interface MaterialSet {
  kit: KitMaterials;
  shared: SharedSet;
  skins: THREE.Material[];
  /** Torso-Material mit der individuellen Trikottextur (Nummer, Name) */
  torso: (map: THREE.Texture) => THREE.Material;
  dispose: () => void;
}

/**
 * Hologramm-Material: Kantenlicht (Fresnel) und feine Scanlines in Teamfarbe, additiv und
 * durchscheinend. Werte über 1 lösen das vorhandene Bloom aus.
 */
function hologramMaterial(color: string, strength = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
        float scan = 0.82 + 0.18 * step(0.5, fract(gl_FragCoord.y * 0.33));
        vec3 c = uColor * (0.18 + 2.6 * f) * scan * uStrength;
        gl_FragColor = vec4(c, (0.18 + 0.8 * f) * uStrength);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Helle, leicht entsättigte Variante einer Teamfarbe – Hologramme brauchen Leuchtkraft. */
function glowOf(hex: string) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return `#${c.setHSL(hsl.h, Math.min(1, hsl.s * 1.1), Math.max(hsl.l, 0.55)).getHexString()}`;
}

export function createMaterialSet(kit: Kit, style: ModelStyle): MaterialSet {
  if (style === 'tracking') {
    // Einheitliche Figur in Trikotfarbe; nur Helm, Facemask und Nummer heben sich ab
    const body = new THREE.MeshStandardMaterial({ color: kit.jersey, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(kit.jersey).multiplyScalar(0.55), roughness: 0.7 });
    const accent = new THREE.MeshStandardMaterial({ color: kit.trim, roughness: 0.5 });
    const helmet = new THREE.MeshPhysicalMaterial({ color: kit.helmet, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
    const mask = new THREE.MeshStandardMaterial({ color: kit.facemask, roughness: 0.4 });
    const inner = new THREE.MeshStandardMaterial({ color: '#08090b', roughness: 1 });
    const owned = [body, dark, accent, helmet, mask, inner];
    return {
      kit: { jersey: body, pants: body, socks: body, helmet, stripe: accent, trim: accent, facemask: mask },
      shared: {
        glove: dark as unknown as THREE.MeshPhysicalMaterial, shoe: dark as unknown as THREE.MeshPhysicalMaterial,
        sole: dark, tape: body, belt: dark, inner, visor: inner as unknown as THREE.MeshPhysicalMaterial,
      },
      skins: [body],
      torso: (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.6 }),
      dispose: () => owned.forEach((m) => m.dispose()),
    };
  }

  if (style === 'hologram') {
    const glow = glowOf(kit.helmetStripe);
    const shell = hologramMaterial(glow, 1);
    const faint = hologramMaterial(glow, 0.55);
    const owned: THREE.Material[] = [shell, faint];
    const k = shell as unknown as THREE.MeshPhysicalMaterial;
    const f = faint as unknown as THREE.MeshPhysicalMaterial;
    return {
      kit: { jersey: k, pants: k, socks: f, helmet: k, stripe: k, trim: k, facemask: k },
      shared: { glove: f, shoe: f, sole: f as unknown as THREE.MeshStandardMaterial, tape: f, belt: f, inner: f, visor: f },
      skins: [faint],
      // Trikottextur leuchtend und durchscheinend – die Rückennummer bleibt lesbar
      torso: (map) => new THREE.MeshBasicMaterial({
        map, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }),
      dispose: () => owned.forEach((m) => m.dispose()),
    };
  }

  // broadcast / athletic: realistische Materialien
  const kitMats = createKitMaterials(kit);
  return {
    kit: kitMats,
    shared: SHARED,
    skins: SHARED.skin,
    torso: (map) => new THREE.MeshPhysicalMaterial({
      map, roughness: 0.68, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.14,
      sheen: 0.3, sheenRoughness: 0.6, sheenColor: sheenOf(kit.jersey),
      bumpMap: FABRIC.jerseyTorso, bumpScale: 0.35,
    }),
    dispose: () => disposeKitMaterials(kitMats),
  };
}

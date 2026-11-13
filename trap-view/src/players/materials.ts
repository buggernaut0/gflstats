import * as THREE from 'three';
import type { Kit } from '../data/kits';

/** Materialien, die sich alle Spieler eines Teams teilen. */
export interface KitMaterials {
  jersey: THREE.MeshStandardMaterial;
  pants: THREE.MeshStandardMaterial;
  socks: THREE.MeshStandardMaterial;
  helmet: THREE.MeshPhysicalMaterial;
  stripe: THREE.MeshStandardMaterial;
  facemask: THREE.MeshStandardMaterial;
}

export function createKitMaterials(kit: Kit): KitMaterials {
  return {
    jersey: new THREE.MeshStandardMaterial({ color: kit.jersey, roughness: 0.72 }),
    pants: new THREE.MeshStandardMaterial({ color: kit.pants, roughness: 0.55 }),
    socks: new THREE.MeshStandardMaterial({ color: kit.socks, roughness: 0.8 }),
    helmet: new THREE.MeshPhysicalMaterial({
      color: kit.helmet, roughness: 0.22, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12,
      envMapIntensity: 2.2,
    }),
    stripe: new THREE.MeshStandardMaterial({ color: kit.helmetStripe, roughness: 0.35 }),
    facemask: new THREE.MeshStandardMaterial({ color: kit.facemask, roughness: 0.35, metalness: 0.6 }),
  };
}

export function disposeKitMaterials(m: KitMaterials) {
  Object.values(m).forEach((mat) => mat.dispose());
}

/** Teamunabhängige Materialien. */
export const SHARED = {
  skin: ['#c99572', '#8a5a3c', '#e0b08c', '#5f3d28'].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
  ),
  glove: new THREE.MeshStandardMaterial({ color: '#17181b', roughness: 0.6 }),
  shoe: new THREE.MeshStandardMaterial({ color: '#0d0e10', roughness: 0.45 }),
  inner: new THREE.MeshStandardMaterial({ color: '#050506', roughness: 1 }),
  visor: new THREE.MeshPhysicalMaterial({
    color: '#0a0c11', roughness: 0.08, metalness: 0.4, clearcoat: 1, envMapIntensity: 2.5,
  }),
};

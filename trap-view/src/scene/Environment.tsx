import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Environment as DreiEnvironment, Lightformer } from '@react-three/drei';

/** Tribünen-Definition: Mitte der ersten Stufe, Ausrichtung, Länge. */
const STANDS: { base: [number, number]; along: 'x' | 'z'; dir: 1 | -1; length: number; tiers: number }[] = [
  { base: [0, -40], along: 'x', dir: -1, length: 150, tiers: 12 },
  { base: [0, 56], along: 'x', dir: 1, length: 150, tiers: 9 },
  { base: [-74, 0], along: 'z', dir: -1, length: 96, tiers: 9 },
  { base: [74, 0], along: 'z', dir: 1, length: 96, tiers: 9 },
];
const TIER_DEPTH = 3.2;
const TIER_RISE = 1.5;

const TOWERS: [number, number][] = [
  [-70, -80], [0, -88], [70, -80], [-70, 88], [70, 88],
];

function lampTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      const g = ctx.createRadialGradient(16 + x * 32, 16 + y * 32, 0, 16 + x * 32, 16 + y * 32, 13);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, '#dfe9ff');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x * 32, y * 32, 32, 32);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Nachthimmel mit schwachem Dunst am Horizont, damit sich die Tribünen als Silhouette abheben. */
function skyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#010203');
  g.addColorStop(0.36, '#03050a');
  g.addColorStop(0.47, '#0e1624');
  g.addColorStop(0.5, '#172236');
  g.addColorStop(0.53, '#06080d');
  g.addColorStop(1, '#010203');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Reduzierte Stadionatmosphäre: dunkler Boden, Tribünen-Silhouetten, Flutlichter. */
export function Environment() {
  const standsRef = useRef<THREE.InstancedMesh>(null);
  const tierCount = STANDS.reduce((n, s) => n + s.tiers, 0);

  useLayoutEffect(() => {
    const mesh = standsRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    let i = 0;
    for (const s of STANDS) {
      for (let k = 0; k < s.tiers; k++) {
        const h = TIER_RISE * (k + 1);
        const off = k * TIER_DEPTH * s.dir;
        const pos = s.along === 'x'
          ? new THREE.Vector3(s.base[0], h / 2, s.base[1] + off)
          : new THREE.Vector3(s.base[0] + off, h / 2, s.base[1]);
        const scale = s.along === 'x'
          ? new THREE.Vector3(s.length, h, TIER_DEPTH)
          : new THREE.Vector3(TIER_DEPTH, h, s.length);
        m.compose(pos, new THREE.Quaternion(), scale);
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  // Vereinzelte Lichtpunkte auf den Rängen
  const crowd = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    let seed = 3;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const c = new THREE.Color();
    for (const s of STANDS) {
      const n = Math.round(s.length * s.tiers * 0.35);
      for (let i = 0; i < n; i++) {
        const k = Math.floor(rand() * s.tiers);
        const t = (rand() - 0.5) * s.length;
        const d = (k + (rand() - 0.5) * 0.6) * TIER_DEPTH * s.dir;
        const y = TIER_RISE * (k + 1) + 0.5;
        if (s.along === 'x') positions.push(s.base[0] + t, y, s.base[1] + d);
        else positions.push(s.base[0] + d, y, s.base[1] + t);
        c.setHSL(0.08 + rand() * 0.55, 0.25, 0.25 + rand() * 0.35);
        colors.push(c.r, c.g, c.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, []);

  const lamp = useMemo(() => lampTexture(), []);
  const sky = useMemo(() => skyTexture(), []);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[480, 24, 24]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>

      {/* Boden außerhalb des Feldes */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#07090c" roughness={1} />
      </mesh>

      <instancedMesh ref={standsRef} args={[undefined, undefined, tierCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#171b24" roughness={0.9} />
      </instancedMesh>

      <points geometry={crowd}>
        <pointsMaterial size={0.5} vertexColors transparent opacity={0.55} sizeAttenuation depthWrite={false} />
      </points>

      {TOWERS.map(([x, z], i) => {
        const angle = Math.atan2(-x, -z);
        return (
          <group key={i} position={[x, 0, z]} rotation-y={angle}>
            <mesh position-y={21}>
              <cylinderGeometry args={[0.5, 0.9, 42, 8]} />
              <meshStandardMaterial color="#0d0f14" roughness={0.8} />
            </mesh>
            <mesh position={[0, 44, 0.6]} rotation-x={0.35}>
              <planeGeometry args={[15, 7.5]} />
              <meshBasicMaterial map={lamp} color={[2.6, 2.8, 3.2]} toneMapped={false} fog={false} />
            </mesh>
          </group>
        );
      })}

      {/* Lokale Reflexionsumgebung für Helme – keine externen Dateien */}
      <DreiEnvironment resolution={256} frames={1} environmentIntensity={0.4}>
        <color attach="background" args={['#020305']} />
        <Lightformer form="rect" intensity={5} color="#dfe8ff" position={[-6, 9, 6]} scale={[10, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color="#a9c4ff" position={[8, 6, -8]} scale={[8, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.5} color="#ffd8b0" position={[-9, 4, -7]} scale={[6, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 12, 0]} scale={4} target={[0, 0, 0]} />
      </DreiEnvironment>
    </group>
  );
}

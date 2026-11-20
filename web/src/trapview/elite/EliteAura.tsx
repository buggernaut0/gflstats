import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel } from '../data/sceneModel';

/** Durchmesser der Bodenplakette in Yards (Ring bei ~0,9 yd Radius – außerhalb des Duell-Rings in Teamfarbe). */
const SIZE = 2.4;

const vertex = /* glsl */ `
  attribute float iPhase;
  varying vec2 vUv;
  varying float vPhase;
  void main() {
    vUv = uv;
    vPhase = iPhase;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }`;

/**
 * Goldene Bodenplakette: weicher, warmer Lichtschein unter dem Spieler, ein klarer Ring und eine feine
 * Haarlinie außen. Ein Glanzpunkt wandert langsam um den Ring – wie Licht auf gebürstetem Metall.
 * Additiv, ohne Tiefe zu schreiben: liegt wie Licht auf dem Rasen, nicht wie ein Objekt darauf.
 */
const fragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vPhase;
  void main() {
    vec2 c = vUv * 2.0 - 1.0;
    float r = length(c);
    float a = atan(c.y, c.x);
    vec3 gold = vec3(1.0, 0.76, 0.36);
    vec3 pale = vec3(1.0, 0.9, 0.66);
    float breathe = 0.88 + 0.12 * sin(uTime * 1.05 + vPhase);
    float pool = exp(-r * r * 4.2) * 0.2 * breathe;
    float ring = smoothstep(0.03, 0.0, abs(r - 0.74));
    float hair = smoothstep(0.014, 0.0, abs(r - 0.83)) * 0.5;
    float glint = pow(0.5 + 0.5 * cos(a - uTime * 0.5 - vPhase), 14.0);
    vec3 col = gold * pool + mix(gold, pale, glint) * ring * (0.5 + 1.3 * glint) + gold * hair * (0.45 + 0.9 * glint);
    gl_FragColor = vec4(col * smoothstep(1.0, 0.92, r), 1.0);
  }`;

/**
 * Hebt alle Elite-Spieler der Startformationen hervor (model.elite – beide Seiten, so viele, wie es gibt):
 * goldene Bodenplakette unter jedem. Zusammen mit dem goldenen Gegenlicht am Modell (playerMaterial.ts) und
 * der Elite-Marke über dem Helm (PlayerLabels.tsx) sind sie in jeder Einstellung sofort zu erkennen.
 */
export function EliteAura({ model, steady = false }: { model: SceneModel; steady?: boolean }) {
  const players = useMemo(() => [...model.elite.offense, ...model.elite.defense], [model]);

  const mesh = useMemo(() => {
    if (!players.length) return null;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2);
    // Jeder Glanzpunkt startet an einer anderen Stelle, damit die Ringe nicht im Gleichtakt laufen
    geo.setAttribute('iPhase', new THREE.InstancedBufferAttribute(Float32Array.from(players, (_, i) => i * 2.39996), 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const m = new THREE.InstancedMesh(geo, mat, players.length);
    const m4 = new THREE.Matrix4();
    players.forEach((p, i) => m.setMatrixAt(i, m4.makeTranslation(p.world[0], 0.018, p.world[2])));
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    m.renderOrder = 1;
    return m;
  }, [players]);

  useEffect(() => () => {
    if (!mesh) return;
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);

  useFrame(({ clock }) => {
    if (mesh && !steady) (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.elapsedTime;
  });

  return mesh ? <primitive object={mesh} /> : null;
}

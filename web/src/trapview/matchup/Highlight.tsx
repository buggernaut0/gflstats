import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel } from '../data/sceneModel';
import { useTrapView } from '../state/store';
import { KEY_INTENSITY, lightingDim } from '../scene/Lighting';
import { playerHighlight } from '../players/playerMaterial';

/** Kantenlänge der Bodenmarke in Yards – Ring bei ≈ 0,66 yd, innerhalb der goldenen Elite-Plakette (≈ 0,89 yd). */
const SIZE = 2.2;
/** Abstand des Spots vom Brustbereich des Spielers (Yards) – Grundlage der Intensitätsberechnung */
const SPOT_HEIGHT = 9;
/** Zusätzliche Aufhellung über der normalen Beleuchtung (Bestrahlungsstärke) – bewusst klein: hebt ab, überstrahlt nicht */
const LIFT = 0.55;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

/**
 * Bodenmarke in kühlem Akzentblau (Website-Akzent, teamunabhängig): klarer Ring, weicher Lichthof nach innen
 * und alle paar Sekunden eine sehr leise Welle nach außen. Additiv und ohne Tiefe zu schreiben – liegt wie
 * Licht auf dem Rasen. Spitzenwerte unter der Bloom-Schwelle: der Ring leuchtet, glüht aber nicht aus.
 */
const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uLevel;
  uniform float uPhase;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv * 2.0 - 1.0;
    float r = length(c);
    vec3 ice = vec3(0.56, 0.69, 1.0);
    vec3 pale = vec3(0.86, 0.91, 1.0);
    float R = 0.6;
    float ring = smoothstep(0.028, 0.0, abs(r - R));
    float halo = smoothstep(0.16, 0.0, abs(r - R)) * 0.28;
    float pool = smoothstep(R, 0.0, r) * 0.07;
    float w = fract(uTime * 0.38 + uPhase);
    float wave = smoothstep(0.03, 0.0, abs(r - (R + w * 0.34))) * (1.0 - w) * (1.0 - w) * 0.35;
    vec3 col = pale * ring * 0.95 + ice * (halo + pool + wave);
    gl_FragColor = vec4(col * uLevel * smoothstep(1.0, 0.94, r), 1.0);
  }`;

/**
 * Hebt die Spieler des aktiven Duells (bzw. den Spieler im Player Spotlight) hervor – ohne ihre Trikots
 * zu verfälschen. Drei Ebenen, die einzeln dezent sind und zusammen klar lesen:
 *
 *   1. Spot von oben: gleicht nur die Abdunklung der Grundbeleuchtung im Matchup-Modus aus (lightingDim)
 *      plus eine kleine Aufhellung. Die Spieler stehen damit etwa im normalen Licht, das übrige Feld liegt
 *      im Halbdunkel – Weiß bleibt unter der Sättigung, Nummern und Namen behalten ihren Kontrast.
 *   2. Bodenring in Akzentblau unter dem Spieler (teamunabhängig, auch bei weißen oder dunklen Trikots).
 *   3. Feine kühle Kontur an der Silhouette (Fresnel im Spielermaterial, siehe playerHighlight) – die
 *      Trikotflächen selbst bleiben unberührt.
 *
 * Lichter und Ringe existieren immer (Intensität 0), damit beim Umschalten keine Shader neu kompiliert werden.
 */
export function Highlight({ model }: { model: SceneModel }) {
  const spots = useMemo(() => [new THREE.SpotLight(), new THREE.SpotLight()], []);
  const state = useMemo(() => ({ level: 0, count: 0 }), []);

  const rings = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2);
    return [0, 1].map((i) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uPhase: { value: i * 0.5 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 2;
      mesh.frustumCulled = false;
      return mesh;
    });
  }, []);

  useMemo(() => {
    for (const s of spots) {
      s.angle = 0.26;
      s.penumbra = 1;
      s.decay = 1.6;
      s.distance = 30;
      s.color.set('#f4f7ff');
      s.intensity = 0;
    }
  }, [spots]);

  useEffect(() => () => {
    rings[0].geometry.dispose();
    for (const r of rings) (r.material as THREE.Material).dispose();
    for (const v of playerHighlight.uHi.value) v.z = 0;
  }, [rings]);

  useFrame((frame, dt) => {
    const st = useTrapView.getState();
    // Gewähltes Duell oder Duell-Einstellung der Präsentation
    const duelId = st.matchupId ?? st.duel?.id ?? null;
    const m = duelId ? model.matchups.find((x) => x.id === duelId) : undefined;
    // Player Spotlight: derselbe Spot und Ring auf dem vorgestellten Spieler
    const sp = !m && st.spotlight ? model.spotlights[st.spotlight.index] : undefined;
    const pair = m ? [m.offense, m.defense] : sp ? [sp.player] : [];
    // Anzahl hervorgehobener Spieler zuletzt (Duell 2, Spotlight 1) – gilt auch beim Ausblenden
    if (pair.length) state.count = pair.length;
    state.level = THREE.MathUtils.damp(state.level, pair.length ? 1 : 0, 3.5, dt);
    const level = state.level;

    // Der Spot ersetzt nur das abgesenkte Hauptlicht (mit Blickwinkel-Faktor ≈ 0,75) und legt eine kleine
    // Aufhellung darauf. Umrechnung Bestrahlungsstärke → Intensität über die Abstandsdämpfung (d^decay).
    const irradiance = KEY_INTENSITY * (1 - lightingDim.value) * 0.75 + LIFT;

    spots.forEach((s, i) => {
      const p = pair[i];
      if (p) {
        const fwd = p.side === 'offense' ? -1 : 1;
        s.position.set(p.world[0] + fwd * 2.5, SPOT_HEIGHT + 1, p.world[2] + Math.sign(p.world[2] || 1) * 2);
        s.target.position.set(p.world[0], 1, p.world[2]);
        s.target.updateMatrixWorld();
      }
      const used = i < state.count;
      const dist = s.position.distanceTo(s.target.position);
      s.intensity = used ? irradiance * Math.pow(dist, s.decay) * level : 0;

      const ring = rings[i];
      const u = (ring.material as THREE.ShaderMaterial).uniforms;
      if (p) ring.position.set(p.world[0], 0.021, p.world[2]);
      u.uTime.value = frame.clock.elapsedTime;
      u.uLevel.value = used ? level : 0;
      ring.visible = used && level > 0.01;

      const hi = playerHighlight.uHi.value[i];
      if (p) hi.set(p.world[0], p.world[2], hi.z, 0);
      hi.z = used ? level : 0;
    });
  });

  return (
    <>
      {spots.map((s, i) => (
        <group key={i}>
          <primitive object={s} />
          <primitive object={s.target} />
          <primitive object={rings[i]} />
        </group>
      ))}
    </>
  );
}

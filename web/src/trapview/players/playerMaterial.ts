import * as THREE from 'three';

interface Options {
  /** Nummern-Atlas (nur Rumpf): R = Ziffern/Name, G = Kontur, B = Relief (weiche Höhe der Beschriftung) */
  numbers?: { texture: THREE.Texture; tileScale: [number, number] };
  /** Klarlack für den Helm */
  gloss?: boolean;
}

/** Elite: warmer Goldglanz an den Konturen der Helmschale (Fresnel) – Trikots bleiben unberührt. */
const ELITE_GLOW = /* glsl */ `
  totalEmissiveRadiance += vElite * vec3(1.0, 0.72, 0.3) * 0.55 * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);`;

/**
 * Matchup-Highlighting (siehe matchup/Highlight.tsx): bis zu zwei hervorgehobene Spieler als (x, z, Stärke, –).
 * Ein gemeinsames Uniform für alle Spielermaterialien – der Highlight-Code schreibt nur diese Werte, ohne
 * Material, Farbe oder Licht der Spieler anzufassen. Stärke 0 = aus (Standard, z. B. auf der Teamseite).
 */
export const playerHighlight = {
  uHi: { value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] },
};

/** Radius um die Spielerposition (Yards), in dem Körperteile zum hervorgehobenen Spieler zählen */
const HI_VERTEX = /* glsl */ `
  #ifdef USE_INSTANCING
    vec2 tvRoot = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
    vHi = max(uHi[0].z * (1.0 - smoothstep(0.55, 0.85, distance(tvRoot, uHi[0].xy))),
              uHi[1].z * (1.0 - smoothstep(0.55, 0.85, distance(tvRoot, uHi[1].xy))));
  #else
    vHi = 0.0;
  #endif`;

/**
 * Hervorhebung als feine Kontur: kühles Fresnel-Licht nur an der Silhouette (streifender Blickwinkel).
 * Flächen, die zur Kamera zeigen – Rückennummer, Name, Trikotbrust –, bekommen praktisch nichts ab,
 * Teamfarben und Beschriftung bleiben unverändert.
 */
const HI_RIM = /* glsl */ `
  totalEmissiveRadiance += vHi * vec3(0.56, 0.69, 1.0) * 0.42 * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 4.0);`;

/**
 * Material des Spielermodells: ein Standard-Material, das Farbe, Rauheit und Metall je Vertex liest
 * (siehe parts.ts) und die Teamfarben je Instanz (iA, iB, iC). So reichen drei Materialien
 * (Körper, Rumpf mit Nummern, Helm) für alle Spieler beider Teams. iElite (0/1) gibt Elite-Spielern einen
 * dezenten goldenen Glanz – nur auf der Helmschale, damit Trikotfarben (gerade Weiß) unverfälscht bleiben.
 *
 * Alle drei Materialien sind vollständig deckend (kein Blending, Tiefe wird geschrieben). Stoff spiegelt die
 * Umgebung nur gedämpft (envMapIntensity), sonst tönen die bläulichen Lichtfelder weiße Trikots ein.
 */
export function createPlayerMaterial(o: Options = {}): THREE.MeshStandardMaterial {
  const base = { vertexColors: true, roughness: 1, metalness: 1 };
  const m = o.gloss
    ? new THREE.MeshPhysicalMaterial({ ...base, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 2 })
    : new THREE.MeshStandardMaterial({ ...base, envMapIntensity: 0.7 });
  m.transparent = false;
  m.opacity = 1;
  m.depthWrite = true;
  m.depthTest = true;
  const num = o.numbers;

  const numVertexPars = /* glsl */ `
    attribute vec2 aNumUv;
    attribute vec3 iNum;
    attribute vec3 iOutline;
    // xy: UV-Ursprung der Kachel, z: Elite (0/1) – zusammengelegt, weil der Rumpf sonst über 16 Attribute käme
    attribute vec3 iTile;
    uniform vec2 uTileScale;
    varying vec3 vNumUv;
    varying vec3 vNumCol;
    varying vec3 vOutCol;`;
  const numVertex = /* glsl */ `
    vNumUv = vec3(iTile.xy + aNumUv * uTileScale, step(0.0, aNumUv.x));
    vElite = iTile.z;
    vNumCol = iNum;
    vOutCol = iOutline;`;
  const numFragmentPars = /* glsl */ `
    uniform sampler2D uNumbers;
    uniform vec2 uAtlasSize;
    varying vec3 vNumUv;
    varying vec3 vNumCol;
    varying vec3 vOutCol;
    // Aufgenähte Beschriftung: Höhe aus dem Blaukanal, Normale per Bildschirm-Ableitung geneigt
    // (wie three.js' Bump-Mapping, aber auf die Atlas-Kachel des Spielers bezogen)
    const float TV_BUMP = 0.9;
    vec3 tvLetterNormal(vec3 surfPos, vec3 surfNorm, float faceDir, float relief) {
      vec2 dSTdx = dFdx(vNumUv.xy);
      vec2 dSTdy = dFdy(vNumUv.xy);
      float h0 = texture2D(uNumbers, vNumUv.xy).b;
      vec2 dH = TV_BUMP * relief * vNumUv.z * vec2(texture2D(uNumbers, vNumUv.xy + dSTdx).b - h0, texture2D(uNumbers, vNumUv.xy + dSTdy).b - h0);
      vec3 sx = normalize(dFdx(surfPos));
      vec3 sy = normalize(dFdy(surfPos));
      vec3 r1 = cross(sy, surfNorm);
      vec3 r2 = cross(surfNorm, sx);
      float det = dot(sx, r1) * faceDir;
      vec3 grad = sign(det) * (dH.x * r1 + dH.y * r2);
      return normalize(abs(det) * surfNorm - grad);
    }`;
  const numFragment = /* glsl */ `
    // Texel je Bildpixel: aus der Ferne würden grobe Mip-Stufen die Nachbarkacheln im Atlas (Nummern anderer
    // Spieler) einmischen – deshalb Gradienten begrenzen (höchstens Mip-Stufe 2, bleibt im Kachelrand).
    vec2 tvGx = dFdx(vNumUv.xy);
    vec2 tvGy = dFdy(vNumUv.xy);
    float tvFp = max(length(tvGx * uAtlasSize), length(tvGy * uAtlasSize));
    float tvK = min(1.0, 4.0 / max(tvFp, 1e-4));
    vec3 tvNum = textureGrad(uNumbers, vNumUv.xy, tvGx * tvK, tvGy * tvK).rgb * vNumUv.z;
    float tvInk = max(tvNum.r, tvNum.g);
    // Relief nur, wo es auflösbar ist – aus der Ferne flimmert es sonst und dunkelt Flächen ab
    float tvRelief = 1.0 - smoothstep(1.5, 3.0, tvFp);
    // Schmaler Kontaktschatten am Rand der Buchstaben: das Relief ragt über die Beschriftung hinaus
    diffuseColor.rgb *= 1.0 - 0.32 * tvRelief * clamp(tvNum.b - tvInk, 0.0, 1.0);
    diffuseColor.rgb = mix(diffuseColor.rgb, vOutCol, tvNum.g);
    diffuseColor.rgb = mix(diffuseColor.rgb, vNumCol, tvNum.r);`;

  m.onBeforeCompile = (shader) => {
    shader.uniforms.uHi = playerHighlight.uHi;
    if (num) {
      shader.uniforms.uNumbers = { value: num.texture };
      shader.uniforms.uTileScale = { value: new THREE.Vector2(...num.tileScale) };
      const img = num.texture.image as { width: number; height: number };
      shader.uniforms.uAtlasSize = { value: new THREE.Vector2(img.width, img.height) };
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', /* glsl */ `
        attribute vec3 aMat;
        attribute vec3 iA;
        attribute vec3 iB;
        attribute vec3 iC;
        ${num ? '' : 'attribute float iElite;'}
        uniform vec4 uHi[2];
        varying vec2 vSurf;
        varying float vElite;
        varying float vHi;
        ${num ? numVertexPars : ''}
        #include <common>`)
      .replace('#include <color_vertex>', /* glsl */ `
        #include <color_vertex>
        if (aMat.x > 0.5) vColor.rgb = aMat.x < 1.5 ? iA : (aMat.x < 2.5 ? iB : iC);
        vSurf = aMat.yz;
        ${HI_VERTEX}
        ${num ? numVertex : 'vElite = iElite;'}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', /* glsl */ `
        varying vec2 vSurf;
        varying float vElite;
        varying float vHi;
        ${num ? numFragmentPars : ''}
        #include <common>`)
      .replace('#include <color_fragment>', /* glsl */ `
        #include <color_fragment>
        ${num ? numFragment : ''}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor *= vSurf.x;
        ${num ? 'roughnessFactor *= mix(1.0, 0.72, tvInk); // Twill-Buchstaben glänzen etwas mehr als der Trikotstoff' : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${o.gloss ? ELITE_GLOW : ''}
        ${HI_RIM}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        ${num ? 'normal = tvLetterNormal(-vViewPosition, normal, faceDirection, tvRelief);' : ''}`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor *= vSurf.y;');
  };
  m.customProgramCacheKey = () => `tv-player-hi:${num ? 'n' : ''}${o.gloss ? 'g' : ''}`;
  return m;
}

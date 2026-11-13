import * as THREE from 'three';

interface Options {
  /** Nummern-Atlas (nur Rumpf): R = Ziffern/Name, G = Kontur */
  numbers?: { texture: THREE.Texture; tileScale: [number, number] };
  /** Klarlack für den Helm */
  gloss?: boolean;
}

/**
 * Material des Spielermodells: ein Standard-Material, das Farbe, Rauheit und Metall je Vertex liest
 * (siehe parts.ts) und die Teamfarben je Instanz (iA, iB, iC). So reichen drei Materialien
 * (Körper, Rumpf mit Nummern, Helm) für alle Spieler beider Teams.
 */
export function createPlayerMaterial(o: Options = {}): THREE.MeshStandardMaterial {
  const base = { vertexColors: true, roughness: 1, metalness: 1 };
  const m = o.gloss
    ? new THREE.MeshPhysicalMaterial({ ...base, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 2 })
    : new THREE.MeshStandardMaterial(base);
  const num = o.numbers;

  const numVertexPars = /* glsl */ `
    attribute vec2 aNumUv;
    attribute vec3 iNum;
    attribute vec3 iOutline;
    attribute vec2 iTile;
    uniform vec2 uTileScale;
    varying vec3 vNumUv;
    varying vec3 vNumCol;
    varying vec3 vOutCol;`;
  const numVertex = /* glsl */ `
    vNumUv = vec3(iTile + aNumUv * uTileScale, step(0.0, aNumUv.x));
    vNumCol = iNum;
    vOutCol = iOutline;`;
  const numFragmentPars = /* glsl */ `
    uniform sampler2D uNumbers;
    varying vec3 vNumUv;
    varying vec3 vNumCol;
    varying vec3 vOutCol;`;
  const numFragment = /* glsl */ `
    vec2 tvNum = texture2D(uNumbers, vNumUv.xy).rg * vNumUv.z;
    diffuseColor.rgb = mix(diffuseColor.rgb, vOutCol, tvNum.g);
    diffuseColor.rgb = mix(diffuseColor.rgb, vNumCol, tvNum.r);`;

  m.onBeforeCompile = (shader) => {
    if (num) {
      shader.uniforms.uNumbers = { value: num.texture };
      shader.uniforms.uTileScale = { value: new THREE.Vector2(...num.tileScale) };
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', /* glsl */ `
        attribute vec3 aMat;
        attribute vec3 iA;
        attribute vec3 iB;
        attribute vec3 iC;
        varying vec2 vSurf;
        ${num ? numVertexPars : ''}
        #include <common>`)
      .replace('#include <color_vertex>', /* glsl */ `
        #include <color_vertex>
        if (aMat.x > 0.5) vColor.rgb = aMat.x < 1.5 ? iA : (aMat.x < 2.5 ? iB : iC);
        vSurf = aMat.yz;
        ${num ? numVertex : ''}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', /* glsl */ `
        varying vec2 vSurf;
        ${num ? numFragmentPars : ''}
        #include <common>`)
      .replace('#include <color_fragment>', /* glsl */ `
        #include <color_fragment>
        ${num ? numFragment : ''}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor *= vSurf.x;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor *= vSurf.y;');
  };
  m.customProgramCacheKey = () => `tv-player:${num ? 'n' : ''}${o.gloss ? 'g' : ''}`;
  return m;
}

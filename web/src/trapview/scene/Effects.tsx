import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

/** Filmischer Look: dezentes Bloom auf Lichtquellen, Vignette, feines Korn, ACES-Tonemapping. */
export function Effects({ msaa = 4 }: { msaa?: number }) {
  return (
    <EffectComposer multisampling={msaa}>
      {/* Schwelle über dem hellsten beleuchteten Weiß (≈ 1,0): Flutlichter und Glanzpunkte glühen, weiße Trikots nicht */}
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1.4} luminanceSmoothing={0.2} radius={0.75} />
      <Vignette offset={0.28} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.35} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

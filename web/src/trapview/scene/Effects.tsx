import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

/** Filmischer Look: dezentes Bloom auf Lichtquellen, Vignette, ACES-Tonemapping, danach feines Korn. */
export function Effects({ msaa = 4 }: { msaa?: number }) {
  return (
    <EffectComposer multisampling={msaa}>
      {/* Schwelle über dem hellsten beleuchteten Weiß (≈ 1,0): Flutlichter und Glanzpunkte glühen, weiße Trikots nicht */}
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1.4} luminanceSmoothing={0.2} radius={0.75} />
      <Vignette offset={0.28} darkness={0.72} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/*
        Korn erst NACH dem Tonemapping und als Overlay. Vorher (Soft Light vor dem Tonemapping) lag beleuchtetes Weiß
        (HDR, über 1) im Korn: die Formel lieferte je Farbkanal falsche Werte, weiße Trikots glitzerten bunt und wirkten
        durchsichtig. Auch nach dem Tonemapping setzt Soft Light (postprocessing) helle Pixel zur Hälfte auf Schwarz –
        Overlay lässt helle Flächen fast unberührt und gibt nur Mitteltönen und Schatten ein feines Korn.
      */}
      <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.12} />
    </EffectComposer>
  );
}

import type { RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import type { SceneModel } from '../data/sceneModel';
import { Field } from '../field/Field';
import { Roster } from '../players/Roster';
import { LabelProjector, type LabelRegistry } from '../labels/PlayerLabels';
import { Highlight } from '../matchup/Highlight';
import { Director } from '../camera/Director';
import { Environment } from './Environment';
import { Lighting } from './Lighting';
import { Effects } from './Effects';

interface SceneProps {
  model: SceneModel;
  /** Overlay für Abblenden bei Schnitten – wird vom Director direkt beschrieben. */
  fadeRef: RefObject<HTMLDivElement | null>;
  /** DOM-Elemente der Spieler-Labels, die pro Frame positioniert werden. */
  labels: RefObject<LabelRegistry>;
}

/** Die komplette 3D-Szene. Enthält bewusst keine Kamera-Controls. */
export function Scene({ model, fadeRef, labels }: SceneProps) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 32, near: 0.1, far: 700, position: [model.losX - 78, 58, 54] }}
    >
      <color attach="background" args={['#030406']} />
      <fogExp2 attach="fog" args={['#05070b', 0.0105]} />
      <Lighting losX={model.losX} />
      <Environment />
      <Field model={model} />
      <Roster model={model} />
      <Highlight model={model} />
      <LabelProjector model={model} registry={labels} />
      <Director model={model} fadeRef={fadeRef} />
      <Effects />
    </Canvas>
  );
}

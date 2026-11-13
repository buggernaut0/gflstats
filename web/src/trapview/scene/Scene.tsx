import { Component, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import type { SceneModel } from '../data/sceneModel';
import { Field } from '../field/Field';
import { Roster } from '../players/Roster';
import { LabelProjector, type LabelRegistry } from '../labels/PlayerLabels';
import { Highlight } from '../matchup/Highlight';
import { Director } from '../camera/Director';
import { Environment } from './Environment';
import { Lighting } from './Lighting';
import { Effects } from './Effects';
import { detectQuality, prefersReducedMotion } from './quality';

interface SceneProps {
  model: SceneModel;
  /** Overlay für Abblenden bei Schnitten – wird vom Director direkt beschrieben. */
  fadeRef: RefObject<HTMLDivElement | null>;
  /** DOM-Elemente der Spieler-Labels, die pro Frame positioniert werden. */
  labels: RefObject<LabelRegistry>;
  /** 3D-Darstellung ist ausgefallen: Fehler beim Aufbau oder vom Browser entzogener WebGL-Kontext. */
  onFail: (reason: 'error' | 'lost') => void;
}

/** Fängt Fehler beim Aufbau der 3D-Szene ab (z. B. WebGL-Kontext nicht erzeugbar), statt die Seite leer zu lassen. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Die komplette 3D-Szene. Enthält bewusst keine Kamera-Controls. */
export function Scene({ model, fadeRef, labels, onFail }: SceneProps) {
  const quality = useMemo(detectQuality, []);
  const reduced = useMemo(prefersReducedMotion, []);
  // Bricht die Bildrate dauerhaft ein, wird die Pixeldichte auf 1 gesenkt
  const [maxDpr, setMaxDpr] = useState(quality.dpr[1]);

  return (
    <SceneBoundary onError={() => onFail('error')}>
      <Canvas
        aria-hidden="true"
        shadows="percentage"
        dpr={[quality.dpr[0], maxDpr]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 32, near: 0.3, far: 700, position: [model.losX - 78, 58, 54] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            onFail('lost');
          });
        }}
      >
        <PerformanceMonitor onDecline={() => setMaxDpr(1)} />
        <color attach="background" args={['#030406']} />
        <fogExp2 attach="fog" args={['#05070b', 0.0105]} />
        <Lighting losX={model.losX} shadowMap={quality.shadowMap} />
        <Environment />
        <Field model={model} ppy={quality.fieldPPY} />
        <Roster model={model} animate={!reduced} />
        <Highlight model={model} />
        <LabelProjector model={model} registry={labels} />
        <Director model={model} fadeRef={fadeRef} steady={reduced} />
        <Effects msaa={quality.msaa} />
      </Canvas>
    </SceneBoundary>
  );
}

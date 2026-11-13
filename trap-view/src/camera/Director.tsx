import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel } from '../data/sceneModel';
import { useTrapView } from '../state/store';
import { resolveAnchor } from './anchors';
import { compileSequence, createPose, evaluateSequence, type CameraPose } from './sequence';
import { buildMainSequence } from './shots/mainSequence';

/** Dauer der Überblendung beim Wechsel zwischen Präsentation und Duell-Ansicht. */
const MODE_BLEND = 1.5;
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

/** Die Einstellungen sind für 16:9 komponiert. */
const REF_ASPECT = 16 / 9;
/**
 * Schmalere Fenster (Hochformat am Handy, 4:3-Tablet): vertikalen Bildwinkel so weit öffnen, dass
 * derselbe horizontale Ausschnitt sichtbar bleibt. Gedeckelt, damit das Bild im Hochformat nicht verzerrt.
 */
function fitFov(fov: number, aspect: number): number {
  if (aspect >= REF_ASPECT) return fov;
  const k = Math.min(REF_ASPECT / aspect, 2.4);
  return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * k));
}

/** Vorbereitete Perspektive auf ein Duell, mit langsamem Schub. */
function matchupPose(model: SceneModel, id: string, elapsed: number, out: CameraPose) {
  const push = Math.min(elapsed, 30) * 0.05;
  out.pos.copy(resolveAnchor(model, { at: `matchup:${id}`, offset: [-7.0 + push, 1.7, 6.6 - push * 0.6], mirror: true }));
  // Blickziel tief ansetzen: die Spieler stehen im oberen Bilddrittel, das Vergleichsfenster darunter
  out.look.copy(resolveAnchor(model, { at: `matchup:${id}`, offset: [0.4, 0.45, 0] }));
  out.fov = 30;
}

/**
 * Der Regisseur: einzige Stelle, die die Kamera bewegt. Liest die Zeit, wertet die
 * Sequenz aus und überblendet kontrolliert in die Duell-Ansicht und zurück.
 * Es gibt keinerlei Nutzersteuerung der Kamera.
 */
export function Director({ model, fadeRef, steady = false }: {
  model: SceneModel;
  fadeRef: RefObject<HTMLDivElement | null>;
  /** Ohne das leichte „Atmen“ der Kamera (prefers-reduced-motion). */
  steady?: boolean;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const sequence = useMemo(() => compileSequence(buildMainSequence(model), model), [model]);

  const time = useRef(0);
  const shotIndex = useRef(-1);
  const restartSeen = useRef(-1);
  const mode = useRef<string>('timeline');
  const modeTime = useRef(0);
  const blendT = useRef(MODE_BLEND);
  const from = useRef(createPose());
  const want = useRef(createPose());
  const now = useRef(createPose());

  useEffect(() => {
    shotIndex.current = -1;
  }, [sequence]);

  // Nur in der Entwicklung: Zeit setzen/anhalten, um einzelne Einstellungen zu prüfen
  const paused = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __tvSeek?: (t: number, pause?: boolean) => void };
    w.__tvSeek = (t, pause = true) => {
      time.current = t;
      paused.current = pause;
    };
    return () => { delete w.__tvSeek; };
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = useTrapView.getState();

    if (s.restartToken !== restartSeen.current) {
      restartSeen.current = s.restartToken;
      time.current = 0;
      shotIndex.current = -1;
      mode.current = 'timeline';
      blendT.current = MODE_BLEND;
    }

    const inMatchup = s.matchupId !== null;
    if (s.phase === 'cinema' && !inMatchup && !paused.current) time.current = Math.min(time.current + dt, sequence.duration);

    // Wechsel Präsentation ↔ Duell: aktuelle Pose merken und weich überblenden
    const key = s.matchupId ?? 'timeline';
    if (key !== mode.current) {
      mode.current = key;
      modeTime.current = 0;
      blendT.current = 0;
      from.current.pos.copy(now.current.pos);
      from.current.look.copy(now.current.look);
      from.current.fov = now.current.fov;
      const ids = inMatchup
        ? (() => {
            const m = model.matchups.find((x) => x.id === s.matchupId);
            return m ? [m.offense.id, m.defense.id] : [];
          })()
        : sequence.shots[Math.max(shotIndex.current, 0)].labelIds;
      s.setVisibleLabels(ids);
    }
    modeTime.current += dt;

    const { index, fade } = evaluateSequence(sequence, time.current, want.current);
    if (inMatchup) matchupPose(model, s.matchupId!, modeTime.current, want.current);

    if (index !== shotIndex.current) {
      shotIndex.current = index;
      const shot = sequence.shots[index];
      s.setChapter({ index, title: shot.shot.title, subtitle: shot.shot.subtitle });
      if (!inMatchup) s.setVisibleLabels(shot.labelIds);
    }
    const ended = time.current >= sequence.duration - 0.01;
    if (ended !== s.ended) s.setEnded(ended);

    const pose = now.current;
    if (blendT.current < MODE_BLEND) {
      blendT.current += dt;
      const w = smoother(Math.min(blendT.current / MODE_BLEND, 1));
      pose.pos.lerpVectors(from.current.pos, want.current.pos, w);
      pose.look.lerpVectors(from.current.look, want.current.look, w);
      pose.fov = THREE.MathUtils.lerp(from.current.fov, want.current.fov, w);
    } else {
      pose.pos.copy(want.current.pos);
      pose.look.copy(want.current.look);
      pose.fov = want.current.fov;
    }

    // Kaum sichtbares Atmen der Kamera, damit das Bild nie völlig starr ist
    const e = steady ? 0 : state.clock.elapsedTime;
    camera.position.copy(pose.pos);
    camera.position.y += Math.sin(e * 0.7) * 0.012;
    camera.lookAt(
      pose.look.x + Math.sin(e * 0.43) * 0.02,
      pose.look.y + Math.sin(e * 0.61 + 1.3) * 0.015,
      pose.look.z + Math.cos(e * 0.37) * 0.02,
    );
    const fov = fitFov(pose.fov, state.size.width / Math.max(state.size.height, 1));
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    if (fadeRef.current) fadeRef.current.style.opacity = inMatchup ? '0' : String(fade);
  });

  return null;
}

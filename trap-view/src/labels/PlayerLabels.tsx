import { memo, useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel, ScenePlayer } from '../data/sceneModel';
import { resolvePose } from '../players/stances';
import { useTrapView } from '../state/store';

/** Gemeinsame Ablage: Spieler-ID → DOM-Element des Labels. */
export type LabelRegistry = Map<string, HTMLDivElement>;

/** Höhe knapp über dem Helm in Yards – dort sitzt die Unterkante des Labels. */
function labelHeight(p: ScenePlayer): number {
  const pose = resolvePose(p.slot.stance);
  const top = pose.hipY + Math.cos(pose.lean) * 0.63 + Math.cos(pose.lean + pose.head) * 0.28;
  return top * 1.15 + 0.14;
}

const Label = memo(function Label({ p, registry }: { p: ScenePlayer; registry: LabelRegistry }) {
  const visible = useTrapView((s) => s.visibleLabels.includes(p.id));
  const featured = useTrapView((s) => s.matchupId !== null && s.visibleLabels.includes(p.id));
  const accent = p.side === 'offense' ? p.team.colors.accent : p.team.colors.secondary;
  const number = p.player?.number;
  return (
    <div
      className="tv-label-anchor"
      ref={(el) => {
        if (el) registry.set(p.id, el);
        else registry.delete(p.id);
      }}
    >
      <div
        className={`tv-label${visible ? ' is-on' : ''}${featured ? ' is-featured' : ''}${p.player ? '' : ' is-empty'}`}
        style={{ ['--accent' as string]: accent }}
      >
        <div className="tv-label__plate">
          {number != null && <span className="tv-label__num">{number}</span>}
          <span className="tv-label__text">
            <span className="tv-label__pos">{p.posLabel}</span>
            <span className="tv-label__name">{p.shortName ?? 'nicht belegt'}</span>
          </span>
        </div>
        <div className="tv-label__tick" />
      </div>
    </div>
  );
});

/**
 * DOM-Ebene mit Broadcast-Labels für alle Spieler. Welche sichtbar sind, bestimmt der
 * Kamera-Director; die Position schreibt der LabelProjector pro Frame direkt ins Element.
 */
export function LabelLayer({ model, registry }: { model: SceneModel; registry: LabelRegistry }) {
  return (
    <div className="tv-labels">
      {model.players.map((p) => (
        <Label key={p.id} p={p} registry={registry} />
      ))}
    </div>
  );
}

/** Läuft in der 3D-Szene und hält die Labels über den Spielern – immer zur Kamera gerichtet. */
export function LabelProjector({ model, registry }: { model: SceneModel; registry: RefObject<LabelRegistry> }) {
  const anchors = useMemo(
    () => model.players.map((p) => ({ id: p.id, pos: new THREE.Vector3(p.world[0], labelHeight(p), p.world[2]) })),
    [model],
  );
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    for (const a of anchors) {
      const el = registry.current.get(a.id);
      if (!el) continue;
      v.copy(a.pos).project(camera);
      if (v.z > 1 || v.z < -1) {
        el.style.visibility = 'hidden';
        continue;
      }
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.visibility = 'visible';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });
  return null;
}

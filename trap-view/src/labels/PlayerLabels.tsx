import { memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel, ScenePlayer } from '../data/sceneModel';
import { buildRig, labelAnchor } from '../players/rig';
import { useTrapView } from '../state/store';

/** Gemeinsame Ablage: Spieler-ID → DOM-Element des Labels. */
export type LabelRegistry = Map<string, HTMLDivElement>;

/** off = ausgeblendet, on = normal, featured = Fokus im Duell, dim = Kontext im Duell. */
type LabelState = 'off' | 'on' | 'featured' | 'dim';

/** Schwarz oder Weiß – je nachdem, was auf der Teamfarbe besser lesbar ist (WCAG-Luminanz). */
function inkOn(color: string): string {
  const c = new THREE.Color();
  try { c.set(color); } catch { return '#f1f2f0'; }
  const lin = (u: number) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  const hex = c.getHexString();
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.22 ? '#050608' : '#f8f9f7';
}

const Label = memo(function Label({ p, state, registry }: { p: ScenePlayer; state: LabelState; registry: LabelRegistry }) {
  const accent = p.side === 'offense' ? p.team.colors.accent : p.team.colors.secondary;
  const team = p.team.colors.primary;
  const teamInk = useMemo(() => inkOn(team), [team]);
  const number = p.player?.number;
  const cls = state === 'off' ? '' : state === 'on' ? ' is-on' : ` is-on is-${state}`;
  return (
    <div
      className="tv-label-anchor"
      data-state={state}
      ref={(el) => {
        if (el) registry.set(p.id, el);
        else registry.delete(p.id);
      }}
      style={{ ['--accent' as string]: accent }}
    >
      {/* Führungslinie, wenn das Label zum Staffeln nach oben versetzt ist (Höhe per scaleY) */}
      <div className="tv-label__leader" />
      <div className="tv-label-lift">
        <div
          className={`tv-label${cls}${p.player ? '' : ' is-empty'}`}
          style={{ ['--team' as string]: team, ['--team-ink' as string]: teamInk }}
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
    </div>
  );
});

/**
 * DOM-Ebene mit Broadcast-Labels für alle Spieler. Welche sichtbar sind, bestimmt der
 * Kamera-Director; die Position schreibt der LabelProjector pro Frame direkt ins Element.
 * Im Duell sind die beiden Duellanten hervorgehoben, ihre Positionsgruppen bleiben gedimmt als Kontext.
 */
export function LabelLayer({ model, registry }: { model: SceneModel; registry: LabelRegistry }) {
  const visible = useTrapView((s) => s.visibleLabels);
  const inMatchup = useTrapView((s) => s.matchupId !== null);

  // Nur bei Wechsel der Sichtbarkeit neu berechnet; memo() rendert danach nur Labels mit geändertem Zustand
  const states = useMemo(() => {
    const on = new Set(visible);
    const focusGroups = new Set(inMatchup ? model.players.filter((p) => on.has(p.id)).map((p) => p.group) : []);
    const out = new Map<string, LabelState>();
    for (const p of model.players) {
      if (on.has(p.id)) out.set(p.id, inMatchup ? 'featured' : 'on');
      else if (focusGroups.has(p.group) && p.player) out.set(p.id, 'dim');
      else out.set(p.id, 'off');
    }
    return out;
  }, [model, visible, inMatchup]);

  return (
    <div className="tv-labels" aria-hidden="true">
      {model.players.map((p) => (
        <Label key={p.id} p={p} state={states.get(p.id) ?? 'off'} registry={registry} />
      ))}
    </div>
  );
}

/** Pixel pro Meter am Spieler, bei denen das Label in Originalgröße erscheint. */
const REF_PX_PER_M = 60;
const MIN_SCALE = 0.82;
const MAX_SCALE = 1.3;

/** Größenfaktor der Plakette je Zustand (entspricht dem CSS-scale) und Platzierungsreihenfolge. */
const STATE_SCALE: Record<LabelState, number> = { off: 1, on: 1, featured: 1.22, dim: 0.86 };
const STATE_RANK: Record<LabelState, number> = { featured: 0, on: 1, dim: 2, off: 3 };
/** Luft zwischen gestaffelten Labels und maximaler Versatz in Bildschirmpixeln. */
const GAP = 4;
const MAX_LIFT = 140;
/** Zeitkonstante, mit der ein Label auf seine neue Staffelhöhe gleitet. */
const LIFT_RATE = 9;

interface Anchor {
  id: string;
  order: number;
  pos: THREE.Vector3;
  // Zuletzt geschriebene Werte – DOM wird nur bei echter Änderung angefasst
  transform: string;
  liftCss: string;
  hidden: boolean;
  lift: number;
  // Pro Frame befüllt
  x: number;
  y: number;
  s: number;
  w: number;
  h: number;
  state: LabelState;
  target: number;
  els: { leader: HTMLElement; lift: HTMLElement; label: HTMLElement } | null;
}

const overlaps = (a: Anchor, b: Anchor, liftA: number) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w + GAP * 2 &&
  a.y - liftA - a.h < b.y - b.target + GAP &&
  b.y - b.target - b.h < a.y - liftA + GAP;

/** Läuft in der 3D-Szene und hält die Labels über den Spielern – immer zur Kamera gerichtet. */
export function LabelProjector({ model, registry }: { model: SceneModel; registry: RefObject<LabelRegistry> }) {
  // Ankerpunkt knapp über dem Helm – aus demselben Skelett berechnet, das auch das Modell stellt
  const anchors = useMemo<Anchor[]>(
    () => model.players.map((p, order) => ({
      id: p.id,
      order,
      pos: labelAnchor(buildRig({ world: p.world, rotationY: p.rotationY, stance: p.slot.stance, build: p.slot.build }, 0)),
      transform: '', liftCss: '', hidden: false, lift: 0,
      x: 0, y: 0, s: 1, w: 0, h: 0, state: 'off', target: 0, els: null,
    })),
    [model],
  );
  const v = useMemo(() => new THREE.Vector3(), []);
  // Wiederverwendete Arbeitslisten – keine Allokation pro Frame
  const active = useMemo<Anchor[]>(() => [], []);
  const placed = useMemo<Anchor[]>(() => [], []);

  // Ungeskalierte Label-Größen pflegt ein ResizeObserver – keine Layout-Abfragen im Frame
  const sizes = useMemo(() => new WeakMap<Element, { w: number; h: number }>(), []);
  const observer = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    observer.current = new ResizeObserver((entries) => {
      for (const e of entries) {
        const b = e.borderBoxSize?.[0];
        sizes.set(e.target, b ? { w: b.inlineSize, h: b.blockSize } : { w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    for (const a of anchors) if (a.els) observer.current.observe(a.els.label);
    return () => observer.current?.disconnect();
  }, [anchors, sizes]);

  useFrame(({ camera, size }, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    // Bildhöhe in Pixel pro Meter Abstand – einmal pro Frame statt pro Label
    const pxPerMeterAt1m = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov ?? 50) / 2));
    active.length = 0;

    // 1. Projektion, Größe und Zustand jedes Labels
    for (const a of anchors) {
      const el = registry.current.get(a.id);
      if (!el) continue;
      if (!a.els) {
        a.els = {
          leader: el.firstElementChild as HTMLElement,
          lift: el.lastElementChild as HTMLElement,
          label: el.lastElementChild!.firstElementChild as HTMLElement,
        };
        observer.current?.observe(a.els.label);
      }
      v.copy(a.pos).project(camera);
      const hidden = v.z > 1 || v.z < -1;
      if (hidden !== a.hidden) {
        a.hidden = hidden;
        el.style.visibility = hidden ? 'hidden' : 'visible';
      }
      a.state = (el.dataset.state as LabelState) ?? 'off';
      a.target = 0;
      if (hidden) continue;

      a.x = (v.x * 0.5 + 0.5) * size.width;
      a.y = (-v.y * 0.5 + 0.5) * size.height;
      // Wurzel dämpft: Totale nicht winzig, Nahaufnahme nicht riesig
      const ppm = pxPerMeterAt1m / Math.max(a.pos.distanceTo(camera.position), 0.1);
      a.s = THREE.MathUtils.clamp(Math.sqrt(ppm / REF_PX_PER_M), MIN_SCALE, MAX_SCALE);
      const box = sizes.get(a.els.label);
      if (a.state !== 'off' && box) {
        const k = a.s * STATE_SCALE[a.state];
        a.w = box.w * k;
        a.h = box.h * k;
        active.push(a);
      }
    }

    // 2. Staffeln: in fester Reihenfolge (Fokus zuerst, dann Formationsplatz) – so springt nichts beim Kameraschwenk.
    //    Ein Label, das ein bereits platziertes überdeckt, rutscht knapp darüber.
    active.sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || a.order - b.order);
    placed.length = 0;
    for (const a of active) {
      let lift = 0;
      for (let guard = 0; guard < 8; guard++) {
        let hit: Anchor | null = null;
        for (const b of placed) if (overlaps(a, b, lift)) { hit = b; break; }
        if (!hit) break;
        lift = a.y - (hit.y - hit.target - hit.h) + GAP;
        if (lift > MAX_LIFT) { lift = MAX_LIFT; break; }
      }
      a.target = lift;
      placed.push(a);
    }

    // 3. Weich auf die Zielhöhe gleiten und nur geänderte Werte schreiben
    const blend = 1 - Math.exp(-LIFT_RATE * Math.min(dt, 0.1));
    for (const a of anchors) {
      if (!a.els || a.hidden) continue;
      a.lift += (a.target - a.lift) * blend;
      if (Math.abs(a.lift - a.target) < 0.25) a.lift = a.target;

      const t = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0) scale(${a.s.toFixed(3)})`;
      if (t !== a.transform) {
        a.transform = t;
        registry.current.get(a.id)!.style.transform = t;
      }
      // Versatz wirkt innerhalb des skalierten Ankers, daher durch die Skalierung teilen
      const local = (a.lift / a.s).toFixed(1);
      if (local !== a.liftCss) {
        a.liftCss = local;
        a.els.lift.style.transform = `translate3d(0, -${local}px, 0)`;
        a.els.leader.style.transform = `scaleY(${local})`;
      }
    }
  });
  return null;
}

import { memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel, ScenePlayer } from '../data/sceneModel';
import { buildRig, labelAnchor } from '../players/rig';
import { useTrapView } from '../state/store';
import { EliteCrest, eliteText } from '../../components/EliteBadge';
import { useI18n } from '../../i18n/react';
import { Headshot } from '../ui/Headshot';

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
  // Elite: beste zehn der Positionsgruppe (Datenexport, spotlight/elite.ts) – kleines Wappen auf der Plakette
  const elite = p.player?.elite?.[0] ?? null;
  const { m } = useI18n();
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
      {/* Hülle für die Sichtbarkeit bei Überdeckung (opacity setzt der LabelProjector) */}
      <div className="tv-label-body">
        <div
          className={`tv-label${cls}${p.player ? '' : ' is-empty'}${elite ? ' is-elite' : ''}`}
          style={{ ['--team' as string]: team, ['--team-ink' as string]: teamInk }}
        >
          <div className="tv-label__plate">
            {/* Im Duell: Foto des Spielers vor der Nummer – sonst bleibt die Plakette schlank */}
            {state === 'featured' && <Headshot src={p.player?.photo} alt="" className="tv-label__photo" />}
            {number != null && <span className="tv-label__num">{number}</span>}
            {elite && <EliteCrest className="tv-label__elite" />}
            <span className="tv-label__text">
              <span className="tv-label__pos">{p.posLabel}</span>
              <span className="tv-label__name">{p.shortName ?? m.trapview.vacant}</span>
            </span>
          </div>
          <div className="tv-label__tick" />
        </div>
        {/* Elite-Marke: steht immer über dem Helm, auch wenn das Namenslabel ausgeblendet ist (dann allein) */}
        {elite && (
          <div className="tv-elite-pin">
            <EliteCrest className="tv-elite-pin__crest" />
            <span className="tv-elite-pin__text">
              <b>{m.elite.word}</b>
              <small>#{elite.rank} {eliteText(elite, m).short}</small>
            </span>
          </div>
        )}
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
    // Unbelegte Plätze stehen schon als Geist im Bild. In Gruppen-Einstellungen würden ihre
    // „nicht belegt“-Labels die echten Namen zustapeln – dort bleiben sie aus, einzeln (QB, Duell) nicht.
    if (on.size > 3) for (const p of model.players) if (!p.player) on.delete(p.id);
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

/** Größenfaktor der Plakette je Zustand (entspricht dem CSS-scale) und Rang bei Überdeckung. */
const STATE_SCALE: Record<LabelState, number> = { off: 1, on: 1, featured: 1.22, dim: 0.86 };
const STATE_RANK: Record<LabelState, number> = { featured: 0, on: 1, dim: 2, off: 3 };
/**
 * Überdeckung (Anteil der eigenen Fläche unter vorrangigen Labels), ab der ein Label ausblendet –
 * und die Schwelle, unter die sie sinken muss, damit es wieder erscheint. Der Abstand verhindert Flackern.
 */
const HIDE_AT = 0.2;
const SHOW_AT = 0.08;
/** Ein sichtbares Label gilt beim Vorrang als so viele Meter näher – kein Hin und Her bei gleicher Tiefe. */
const STICKY_M = 1.5;
/**
 * Trenches (O-Line, D-Line): Jeder Spieler behält seinen Namen, auch wenn sich Labels überlappen – dort wird
 * nie ausgeblendet, das nähere liegt nur oben. Lieber zwei teilweise überlagerte Namen als einer, der verschwindet.
 */
const TRENCH_GROUPS: ReadonlySet<ScenePlayer['group']> = new Set(['OL', 'DL']);

interface Anchor {
  id: string;
  pos: THREE.Vector3;
  /** O-Line/D-Line: Label wird bei Überdeckung nie ausgeblendet */
  trench: boolean;
  // Zuletzt geschriebene Werte – DOM wird nur bei echter Änderung angefasst
  transform: string;
  hidden: boolean;
  /** Von einem vorrangigen Label überdeckt und deshalb ausgeblendet. */
  covered: boolean;
  z: number;
  // Pro Frame befüllt
  x: number;
  y: number;
  s: number;
  w: number;
  h: number;
  dist: number;
  state: LabelState;
  els: { body: HTMLElement; label: HTMLElement } | null;
}

/** Fläche, die sich die Rechtecke zweier Labels (unten mittig verankert) auf dem Bildschirm teilen. */
function sharedArea(a: Anchor, b: Anchor): number {
  const w = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
  if (w <= 0) return 0;
  const h = Math.min(a.y, b.y) - Math.max(a.y - a.h, b.y - b.h);
  return h <= 0 ? 0 : w * h;
}

/**
 * Läuft in der 3D-Szene und hält jedes Label an einem festen Punkt knapp über dem Helm seines Spielers.
 * Labels werden nie verschoben, um einander auszuweichen – sonst rutschen sie bei jeder Kamerafahrt
 * auf und ab. Überdeckt ein vorrangiges Label (Fokus vor Normal vor Kontext, sonst das nähere) ein
 * anderes zu großen Teilen, blendet das hintere ruhig aus und erscheint wieder, sobald es frei steht –
 * außer in den Trenches (TRENCH_GROUPS): Dort bleiben alle Namen stehen und dürfen sich überlappen.
 */
export function LabelProjector({ model, registry }: { model: SceneModel; registry: RefObject<LabelRegistry> }) {
  // Ankerpunkt knapp über dem Helm – aus demselben Skelett berechnet, das auch das Modell stellt
  const anchors = useMemo<Anchor[]>(
    () => model.players.map((p) => ({
      id: p.id,
      trench: TRENCH_GROUPS.has(p.group),
      pos: labelAnchor(buildRig({ world: p.world, rotationY: p.rotationY, stance: p.slot.stance, build: p.slot.build }, 0)),
      transform: '', hidden: false, covered: false, z: -1,
      x: 0, y: 0, s: 1, w: 0, h: 0, dist: 0, state: 'off', els: null,
    })),
    [model],
  );
  const v = useMemo(() => new THREE.Vector3(), []);
  // Wiederverwendete Arbeitslisten – keine Allokation pro Frame
  const active = useMemo<Anchor[]>(() => [], []);
  const shown = useMemo<Anchor[]>(() => [], []);

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

  useFrame(({ camera, size }) => {
    const cam = camera as THREE.PerspectiveCamera;
    // Bildhöhe in Pixel pro Meter Abstand – einmal pro Frame statt pro Label
    const pxPerMeterAt1m = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov ?? 50) / 2));
    active.length = 0;

    // 1. Projektion, Größe und Zustand jedes Labels – die Position folgt allein dem Spieler
    for (const a of anchors) {
      const el = registry.current.get(a.id);
      if (!el) continue;
      if (!a.els) {
        const body = el.firstElementChild as HTMLElement;
        a.els = { body, label: body.firstElementChild as HTMLElement };
        observer.current?.observe(a.els.label);
      }
      v.copy(a.pos).project(camera);
      const hidden = v.z > 1 || v.z < -1;
      if (hidden !== a.hidden) {
        a.hidden = hidden;
        el.style.visibility = hidden ? 'hidden' : 'visible';
      }
      a.state = (el.dataset.state as LabelState) ?? 'off';
      if (hidden) continue;

      a.x = (v.x * 0.5 + 0.5) * size.width;
      a.y = (-v.y * 0.5 + 0.5) * size.height;
      a.dist = a.pos.distanceTo(camera.position);
      // Wurzel dämpft: Totale nicht winzig, Nahaufnahme nicht riesig
      a.s = THREE.MathUtils.clamp(Math.sqrt(pxPerMeterAt1m / Math.max(a.dist, 0.1) / REF_PX_PER_M), MIN_SCALE, MAX_SCALE);
      const t = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0) scale(${a.s.toFixed(3)})`;
      if (t !== a.transform) {
        a.transform = t;
        el.style.transform = t;
      }
      const box = sizes.get(a.els.label);
      if (a.state !== 'off' && box) {
        const k = a.s * STATE_SCALE[a.state];
        a.w = box.w * k;
        a.h = box.h * k;
        active.push(a);
      } else {
        // Ausgeschaltete Labels starten beim nächsten Einblenden frei und ohne alten Rang
        if (a.covered) {
          a.covered = false;
          a.els.body.style.opacity = '';
        }
        if (a.z !== 0) {
          a.z = 0;
          el.style.zIndex = '';
        }
      }
    }

    // 2. Vorrang: Fokus vor Normal vor Kontext, innerhalb davon das nähere (sichtbare leicht bevorzugt).
    active.sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state]
      || (a.dist - (a.covered ? 0 : STICKY_M)) - (b.dist - (b.covered ? 0 : STICKY_M)));

    // 3. Überdeckung prüfen: nur Sichtbarkeit ändert sich, nie die Position
    shown.length = 0;
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      let covered = false;
      if (a.state !== 'featured' && !a.trench) {
        let area = 0;
        for (const b of shown) area += sharedArea(a, b);
        const ratio = area / Math.max(a.w * a.h, 1);
        covered = a.covered ? ratio > SHOW_AT : ratio > HIDE_AT;
      }
      if (covered !== a.covered) {
        a.covered = covered;
        a.els!.body.style.opacity = covered ? '0' : '';
      }
      if (!covered) shown.push(a);
      // Vorrangige Labels liegen oben
      const z = active.length - i;
      if (z !== a.z) {
        a.z = z;
        registry.current.get(a.id)!.style.zIndex = String(z);
      }
    }
  });
  return null;
}

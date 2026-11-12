"use client";

/**
 * 3D-Ansicht des Radar-Charts (three.js). Zeigt dieselben Werte wie die 2D-Ansicht - nichts kommt hinzu:
 * Der Abstand eines Eckpunkts von der Mitte ist der normalisierte Wert (0-100) wie in 2D, und derselbe Wert
 * bestimmt zusaetzlich die Hoehe des Eckpunkts. Die Hoehe ist also eine zweite Darstellung derselben Zahl,
 * keine weitere Kennzahl. Weil eine gekippte Ansicht Strecken perspektivisch verkuerzt, bleibt 2D die
 * Standardansicht fuer den genauen Vergleich; Rohwert und Perzentil stehen beim Ueberfahren und in der Tabelle.
 * Linienart und Punktform je Spieler entsprechen der 2D-Ansicht (Kugel, Wuerfel, Tetraeder).
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import type { RadarSeries } from "./Radar";

const R = 10; // Radius des Bodens (= 100)
const H = 4.6; // Hoehe bei 100
const DASH: [number, number][] = [[0, 0], [0.7, 0.45], [0.2, 0.35]]; // wie SERIES_STYLE: durchgezogen, gestrichelt, gepunktet

interface Props {
  axes: string[];
  series: RadarSeries[];
  median?: (number | null)[];
  onFail: () => void;
}

export default function Radar3D({ axes, series, median, onFail }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const ticks = useRef<(HTMLSpanElement | null)[]>([]);
  const [hover, setHover] = useState<{ s: number; a: number } | null>(null);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;
  const [theme, setTheme] = useState(0);
  const view = useRef({ rot: -0.5, elev: 0.62 }); // bleibt beim Neuaufbau (Theme, Daten) erhalten
  const played = useRef(false);

  // Farben kommen aus den CSS-Variablen; bei Theme-Wechsel neu aufbauen
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const key = JSON.stringify([axes, series.map((s) => [s.pct, s.hidden]), median]);

  useEffect(() => {
    const el = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      onFail();
      return;
    }
    const css = getComputedStyle(el);
    const col = (name: string, fallback: string) => new THREE.Color(css.getPropertyValue(name).trim() || fallback);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const cv = renderer.domElement;
    el.prepend(cv);
    cv.style.display = "block";
    cv.style.touchAction = "pan-y";
    cv.style.cursor = "grab";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
    const root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(6, 14, 8);
    scene.add(sun);

    const n = axes.length;
    const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const at = (i: number, p: number, y = 0) => new THREE.Vector3(Math.cos(ang(i)) * R * (p / 100), y, Math.sin(ang(i)) * R * (p / 100));
    const fat: LineMaterial[] = [];
    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);
    const loop = (pts: THREE.Vector3[], color: THREE.Color, width: number, dash?: [number, number], opacity = 1) => {
      const g = keep(new LineGeometry());
      g.setPositions([...pts, pts[0]].flatMap((p) => [p.x, p.y, p.z]));
      const m = keep(new LineMaterial({ color, linewidth: width, dashed: !!dash && dash[0] > 0, dashSize: dash?.[0] ?? 1, gapSize: dash?.[1] ?? 0, transparent: opacity < 1, opacity }));
      fat.push(m);
      const l = new Line2(g, m);
      l.computeLineDistances();
      return l;
    };

    // Boden: Platte mit Kante, Ringe bei 20 bis 100, Achsen
    const shape = new THREE.Shape(axes.map((_, i) => new THREE.Vector2(at(i, 100).x, at(i, 100).z)));
    const floorGeo = keep(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }));
    floorGeo.rotateX(Math.PI / 2); // Extrusion zeigt nach unten, Oberseite bei y = 0
    const floor = new THREE.Mesh(floorGeo, [keep(new THREE.MeshLambertMaterial({ color: col("--radar-floor-in", "#17243a") })), keep(new THREE.MeshLambertMaterial({ color: col("--radar-edge", "#070d17") }))]);
    root.add(floor);
    const line = col("--line", "#233148");
    const lineStrong = col("--line-strong", "#31415c");
    for (const p of [20, 40, 60, 80, 100]) root.add(loop(axes.map((_, i) => at(i, p, 0.02)), p === 100 ? lineStrong : line, p === 100 ? 2 : 1.2));
    const axisGeo = keep(new THREE.BufferGeometry().setFromPoints(axes.flatMap((_, i) => [new THREE.Vector3(0, 0.02, 0), at(i, 100, 0.02)])));
    root.add(new THREE.LineSegments(axisGeo, keep(new THREE.LineBasicMaterial({ color: line }))));
    // Median der Vergleichsgruppe: gestrichelt auf dem Boden, wie in 2D
    root.add(loop(axes.map((_, i) => at(i, median?.[i] ?? 50, 0.04)), col("--ink-3", "#74839a"), 1.6, [0.3, 0.35]));

    // Profile: Eckpunkt bei Radius = Wert und Hoehe = Wert; Flaeche von der Mitte (Hoehe 0) zu den Eckpunkten, Waende zum Boden
    const grow: THREE.Object3D[] = [];
    const points: { s: number; a: number; pos: THREE.Vector3; mesh: THREE.Mesh }[] = [];
    const markerGeo = [keep(new THREE.SphereGeometry(0.34, 20, 14)), keep(new THREE.BoxGeometry(0.54, 0.54, 0.54)), keep(new THREE.TetrahedronGeometry(0.46))];
    series.forEach((s, si) => {
      if (s.hidden) return;
      const color = col(`--series-${si + 1}`, ["#1fa86a", "#e05a59", "#3987e5"][si]);
      const top = s.pct.map((p, i) => at(i, p ?? 0, ((p ?? 0) / 100) * H));
      const g = new THREE.Group();
      const topPos: number[] = [];
      const wallPos: number[] = [];
      const tri = (to: number[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => to.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      const center = new THREE.Vector3(0, 0.05, 0);
      top.forEach((a, i) => {
        const b = top[(i + 1) % n];
        tri(topPos, center, b, a);
        const a0 = new THREE.Vector3(a.x, 0.05, a.z);
        const b0 = new THREE.Vector3(b.x, 0.05, b.z);
        tri(wallPos, a, b, b0);
        tri(wallPos, a, b0, a0);
      });
      const part = (pos: number[], opacity: number, order: number) => {
        const geo = keep(new THREE.BufferGeometry());
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, keep(new THREE.MeshLambertMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, flatShading: true })));
        m.renderOrder = order;
        g.add(m);
      };
      part(wallPos, 0.16, 1 + si); // Waende zum Boden: nur angedeutet
      part(topPos, 0.46, 4 + si); // Oberflaeche traegt die Form
      const rim = loop(top, color, 3, DASH[si]);
      rim.renderOrder = 5;
      g.add(rim);
      // Stuetzen vom Boden zu den Eckpunkten machen die Hoehe ablesbar
      const postGeo = keep(new THREE.BufferGeometry().setFromPoints(top.flatMap((p, i) => (s.pct[i] === null ? [] : [new THREE.Vector3(p.x, 0.05, p.z), p]))));
      g.add(new THREE.LineSegments(postGeo, keep(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }))));
      const mm = keep(new THREE.MeshLambertMaterial({ color }));
      top.forEach((p, i) => {
        if (s.pct[i] === null) return;
        const m = new THREE.Mesh(markerGeo[si % 3], mm);
        m.position.copy(p);
        g.add(m);
        points.push({ s: si, a: i, pos: p, mesh: m });
      });
      root.add(g);
      grow.push(g);
    });

    // Kamera und Darstellung
    let w = 0;
    let h = 0;
    const place = () => {
      const narrow = w < 480;
      const d = narrow ? 49 : 43;
      const e = view.current.elev;
      camera.position.set(0, Math.sin(e) * d, Math.cos(e) * d);
      camera.lookAt(0, 1.4, 0);
      root.rotation.y = view.current.rot;
    };
    const v = new THREE.Vector3();
    const project = (p: THREE.Vector3) => {
      v.copy(p).applyMatrix4(root.matrixWorld).project(camera);
      return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h] as const;
    };
    let raf = 0;
    let t0 = 0;
    let intro = reduced || played.current ? 1 : 0;
    const render = () => {
      raf = 0;
      if (intro < 1) {
        const now = performance.now();
        if (!t0) t0 = now;
        const k = Math.min(1, (now - t0) / 900);
        intro = 1 - Math.pow(1 - k, 3);
        if (k >= 1) played.current = true;
      }
      grow.forEach((g) => g.scale.set(1, Math.max(0.001, intro), 1));
      place();
      root.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      renderer.render(scene, camera);
      const [cx] = project(new THREE.Vector3(0, 0, 0));
      axes.forEach((_, i) => {
        const l = labels.current[i];
        if (!l) return;
        const [x, y] = project(at(i, 120, 0));
        // links/rechts der Mitte seitlich anschlagen, in der Buehne halten
        const lw = l.offsetWidth;
        const left = Math.min(w - lw - 2, Math.max(2, Math.abs(x - cx) < w * 0.06 ? x - lw / 2 : x > cx ? x : x - lw));
        l.style.transform = `translate(${left.toFixed(1)}px, ${(y - l.offsetHeight / 2).toFixed(1)}px)`;
      });
      [20, 40, 60, 80].forEach((p, k) => {
        const l = ticks.current[k];
        if (!l) return;
        const [x, y] = project(at(0, p, 0));
        l.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(4px, -110%)`;
      });
      const hv = hoverRef.current;
      points.forEach((pt) => pt.mesh.scale.setScalar(hv && hv.s === pt.s && hv.a === pt.a ? 1.5 : 1));
      if (intro < 1) invalidate();
    };
    const invalidate = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    api.current = invalidate;

    const resize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cv.style.width = "100%";
      cv.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fat.forEach((m) => m.resolution.set(w, h));
      invalidate();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Ziehen dreht (waagerecht) und kippt (senkrecht); Ueberfahren eines Eckpunkts zeigt den Wert
    const nearest = (ev: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const mx = ev.clientX - r.left;
      const my = ev.clientY - r.top;
      let best: { s: number; a: number } | null = null;
      let bd = ev.pointerType === "touch" ? 26 : 16;
      for (const pt of points) {
        const [x, y] = project(pt.pos);
        const d = Math.hypot(x - mx, y - my);
        if (d < bd) {
          bd = d;
          best = { s: pt.s, a: pt.a };
        }
      }
      return best;
    };
    let drag: { x: number; y: number; id: number; moved: boolean; touch: boolean } | null = null;
    const down = (ev: PointerEvent) => {
      drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, moved: false, touch: ev.pointerType === "touch" };
      if (!drag.touch) cv.setPointerCapture(ev.pointerId);
      cv.style.cursor = "grabbing";
    };
    const move = (ev: PointerEvent) => {
      if (drag && drag.id === ev.pointerId) {
        const dx = ev.clientX - drag.x;
        const dy = ev.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        view.current.rot += dx * 0.01;
        // Touch: senkrechtes Wischen bleibt dem Scrollen der Seite ueberlassen
        if (!drag.touch) view.current.elev = Math.min(1.45, Math.max(0.25, view.current.elev + dy * 0.006));
        drag.x = ev.clientX;
        drag.y = ev.clientY;
        invalidate();
        return;
      }
      if (ev.pointerType === "touch") return;
      const b = nearest(ev);
      const cur = hoverRef.current;
      if ((b?.s ?? -1) !== (cur?.s ?? -1) || (b?.a ?? -1) !== (cur?.a ?? -1)) setHover(b);
    };
    const up = (ev: PointerEvent) => {
      if (drag && !drag.moved) setHover(nearest(ev)); // Tippen/Klicken waehlt einen Eckpunkt
      drag = null;
      cv.style.cursor = "grab";
    };
    const leave = (ev: PointerEvent) => ev.pointerType !== "touch" && !drag && setHover(null);
    const keydown = (ev: KeyboardEvent) => {
      const step = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[ev.key];
      if (!step) return;
      ev.preventDefault();
      view.current.rot += step[0];
      view.current.elev = Math.min(1.45, Math.max(0.25, view.current.elev + step[1]));
      invalidate();
    };
    const lost = (ev: Event) => {
      ev.preventDefault();
      onFail();
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", leave);
    cv.addEventListener("webglcontextlost", lost);
    el.addEventListener("keydown", keydown);

    return () => {
      api.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
      cv.removeEventListener("pointerleave", leave);
      cv.removeEventListener("webglcontextlost", lost);
      el.removeEventListener("keydown", keydown);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      cv.remove();
    };
    // Neuaufbau nur bei geaenderten Daten oder Theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, theme]);

  const api = useRef<(() => void) | null>(null);
  useEffect(() => api.current?.(), [hover]);

  const tip = hover ? series[hover.s] : null;
  return (
    <div
      ref={mount}
      tabIndex={0}
      role="img"
      aria-label={`3D-Ansicht des Radar-Vergleichs: ${series.filter((s) => !s.hidden).map((s) => s.name).join(", ")}. Mit den Pfeiltasten drehen und kippen. Die Werte stehen in der Tabelle.`}
      className="radar3d relative overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
    >
      {axes.map((label, i) => (
        <span
          key={i}
          ref={(n) => {
            labels.current[i] = n;
          }}
          style={{ textShadow: "0 0 4px var(--bg), 0 0 8px var(--bg)" }}
          className={`pointer-events-none absolute left-0 top-0 max-w-[9.5em] text-center text-[12.5px] leading-tight ${hover?.a === i ? "font-semibold text-ink" : "font-medium text-ink-2"}`}
        >
          {label}
        </span>
      ))}
      {[20, 40, 60, 80].map((p, k) => (
        <span
          key={p}
          ref={(n) => {
            ticks.current[k] = n;
          }}
          className="pointer-events-none absolute left-0 top-0 text-[10.5px] text-ink-3"
        >
          {p}
        </span>
      ))}
      {tip && hover && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-[13px] shadow-lg shadow-black/30">
          <p className="font-medium text-ink">{tip.name}</p>
          <p className="text-ink-2">
            {axes[hover.a]}: <span className="num font-semibold text-ink">{tip.raw[hover.a]}</span>
          </p>
          <p className="text-ink-3">{tip.pct[hover.a] === null ? "nicht erfasst" : `${Math.round(tip.pct[hover.a]!)}. Perzentil`}</p>
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * 3D-Szene der Starting Lineup (three.js, ohne weitere Bibliotheken). Wird nur bei Bedarf nachgeladen
 * (siehe LineupField). Die Figuren sind bewusst stilisiert: Helm, Schulterpolster, Trikot mit der
 * Rueckennummer aus dem offiziellen Kader. Unbesetzte Plaetze erscheinen als blasse Figur ohne Nummer.
 * Alle Angaben kommen als Props; die Szene erfindet nichts dazu.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { FieldPlayer, Unit } from "./types";

interface Props {
  players: FieldPlayer[];
  unit: Unit;
  colors: { primary: string; secondary: string };
  /** Adresse des Teamlogos fuer die Feldmitte (offizielles Logo aus curation/teams.json) */
  logo?: string | null;
  active: number | null;
  onActive: (index: number | null) => void;
  onOpen: (index: number) => void;
  onFail: () => void;
}

const FIELD_W = 56;
const FIELD_D = 90;

function fieldTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1344;
  c.height = 2160;
  const g = c.getContext("2d")!;
  const sx = c.width / FIELD_W;
  const sz = c.height / FIELD_D;
  // Rasen in 5-Yard-Bahnen
  for (let i = 0; i < FIELD_D / 5 + 1; i++) {
    g.fillStyle = i % 2 ? "#1c5a3d" : "#1a5238";
    g.fillRect(0, i * 5 * sz - 2 * sz, c.width, 5 * sz);
  }
  const zToY = (z: number) => (z + FIELD_D / 2) * sz;
  g.strokeStyle = "rgba(255,255,255,0.78)";
  g.lineWidth = 5;
  for (let z = -40; z <= 40; z += 5) {
    if (z === 0) continue;
    g.beginPath();
    g.moveTo(0, zToY(z));
    g.lineTo(c.width, zToY(z));
    g.stroke();
  }
  // Hash Marks jedes Yard
  g.lineWidth = 3;
  for (let z = -44; z <= 44; z++) {
    for (const x of [-9.25, 9.25, -FIELD_W / 2 + 1.2, FIELD_W / 2 - 1.2]) {
      g.beginPath();
      g.moveTo((x + FIELD_W / 2) * sx - 0.35 * sx, zToY(z));
      g.lineTo((x + FIELD_W / 2) * sx + 0.35 * sx, zToY(z));
      g.stroke();
    }
  }
  // Line of Scrimmage
  g.strokeStyle = "#f5c63c";
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(0, zToY(0));
  g.lineTo(c.width, zToY(0));
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function numberTexture(n: number, ink: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 256, 256);
  g.font = '700 190px "Barlow Condensed", "Arial Narrow", Arial, sans-serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = ink;
  g.fillText(String(n), 128, 140);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function blobTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  r.addColorStop(0, "rgba(0,0,0,0.5)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

interface Figure {
  group: THREE.Group;
  body: THREE.Group;
  ring: THREE.Mesh;
  jersey: THREE.MeshStandardMaterial | null;
  hit: THREE.Mesh;
  index: number;
  unit: Unit;
  lift: number;
  phase: number;
}

export default function LineupScene({ players, unit, colors, logo, active, onActive, onOpen, onFail }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef({ unit, active, onActive, onOpen });
  state.current = { unit, active, onActive, onOpen };
  const api = useRef<{ invalidate: () => void } | null>(null);

  useEffect(() => {
    // Erst die Schrift fuer die Rueckennummern laden, dann die Szene bauen (Canvas-Texturen werden einmal gezeichnet)
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const fonts = document.fonts?.load('700 190px "Barlow Condensed"').catch(() => undefined) ?? Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (!cancelled) cleanup = build();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Szene wird nur bei geaenderten Daten neu aufgebaut
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, colors.primary, colors.secondary, logo]);

  function build(): (() => void) | undefined {
    const el = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      onFail();
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y";

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0f3324, 38, 78); // ferner Rasen laeuft in den Hintergrund der Buehne aus
    const camera = new THREE.PerspectiveCamera(34, 2, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a3a2a, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-12, 24, 10);
    scene.add(sun);

    let disposed = false;
    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T): T => (disposables.push(x), x);

    // Feld
    const fieldMat = keep(new THREE.MeshStandardMaterial({ map: keep(fieldTexture()), roughness: 0.95 }));
    const field = new THREE.Mesh(keep(new THREE.PlaneGeometry(FIELD_W, FIELD_D)), fieldMat);
    field.rotation.x = -Math.PI / 2;
    scene.add(field);
    const los = new THREE.Mesh(keep(new THREE.PlaneGeometry(FIELD_W, 1.6)), keep(new THREE.MeshBasicMaterial({ color: 0xf5c63c, transparent: true, opacity: 0.12, depthWrite: false })));
    los.rotation.x = -Math.PI / 2;
    los.position.y = 0.02;
    scene.add(los);

    // Teamlogo in der Feldmitte (wie auf dem echten Rasen aufgemalt); dreht mit der Kamera mit, damit es lesbar bleibt
    let decal: THREE.Mesh | null = null;
    if (logo) {
      const decalMat = keep(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      decal = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), decalMat);
      decal.rotation.order = "YXZ";
      decal.rotation.x = -Math.PI / 2;
      decal.position.set(0, 0.015, -11);
      decal.renderOrder = -1;
      scene.add(decal);
      new THREE.TextureLoader().load(logo, (tex) => {
        if (disposed) return tex.dispose();
        keep(tex);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        const img = tex.image as HTMLImageElement;
        const k = 15 / Math.max(img.width, img.height);
        decal!.scale.set(img.width * k, img.height * k, 1);
        decalMat.map = tex;
        decalMat.opacity = 0.5;
        decalMat.needsUpdate = true;
        invalidate();
      });
    }

    // Geometrien und Materialien (geteilt)
    const geo = {
      leg: keep(new THREE.CylinderGeometry(0.17, 0.14, 0.86, 10)),
      torso: keep(new THREE.CylinderGeometry(0.42, 0.33, 0.78, 14)),
      pads: keep(new THREE.CapsuleGeometry(0.3, 0.72, 4, 12)),
      arm: keep(new THREE.CylinderGeometry(0.12, 0.1, 0.62, 8)),
      helmet: keep(new THREE.SphereGeometry(0.31, 20, 14)),
      stripe: keep(new THREE.TorusGeometry(0.312, 0.035, 6, 20, Math.PI)),
      mask: keep(new THREE.TorusGeometry(0.2, 0.025, 6, 14, Math.PI)),
      num: keep(new THREE.PlaneGeometry(0.62, 0.62)),
      blob: keep(new THREE.PlaneGeometry(1.9, 1.9)),
      ring: keep(new THREE.RingGeometry(0.72, 0.86, 40)),
      hit: keep(new THREE.CylinderGeometry(0.85, 0.85, 2.6, 8)),
    };
    const primary = new THREE.Color(colors.primary);
    const hsl = { h: 0, s: 0, l: 0 };
    primary.getHSL(hsl);
    const light = hsl.l > 0.6; // helles Trikot: dunkle Nummer und dunkle Hose fuer Kontrast
    const secondary = new THREE.Color(colors.secondary);
    const mat = {
      pants: keep(new THREE.MeshStandardMaterial({ color: light ? 0x566377 : 0xe9edf2, roughness: 0.8 })),
      helmet: keep(new THREE.MeshStandardMaterial({ color: primary, roughness: 0.25, metalness: 0.25 })),
      accent: keep(new THREE.MeshStandardMaterial({ color: secondary, roughness: 0.5 })),
      skin: keep(new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.9 })),
      ghost: keep(new THREE.MeshStandardMaterial({ color: 0xcfd8e3, transparent: true, opacity: 0.2, roughness: 1, depthWrite: false })),
      blob: keep(new THREE.MeshBasicMaterial({ map: keep(blobTexture()), transparent: true, depthWrite: false })),
      ring: keep(new THREE.MeshBasicMaterial({ color: 0xf5c63c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })),
      hit: keep(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })),
    };

    const figures: Figure[] = players.map((p, index) => {
      const ghost = !p.id;
      const group = new THREE.Group();
      const body = new THREE.Group();
      group.add(body);
      const jersey = ghost ? null : keep(new THREE.MeshStandardMaterial({ color: primary, roughness: 0.62, emissive: 0xffffff, emissiveIntensity: 0 }));
      const m = (g: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z = 0) => {
        const mesh = new THREE.Mesh(g, ghost ? mat.ghost : material);
        mesh.position.set(x, y, z);
        body.add(mesh);
        return mesh;
      };
      m(geo.leg, mat.pants, -0.2, 0.43);
      m(geo.leg, mat.pants, 0.2, 0.43);
      m(geo.torso, jersey ?? mat.ghost, 0, 1.2).scale.set(1, 1, 0.72);
      const pads = m(geo.pads, jersey ?? mat.ghost, 0, 1.58);
      pads.rotation.z = Math.PI / 2;
      pads.scale.set(1, 1, 0.82);
      m(geo.arm, mat.skin, -0.66, 1.2).rotation.z = -0.12;
      m(geo.arm, mat.skin, 0.66, 1.2).rotation.z = 0.12;
      m(geo.helmet, mat.helmet, 0, 2.08);
      if (!ghost) {
        const stripe = m(geo.stripe, mat.accent, 0, 2.08);
        stripe.rotation.y = Math.PI / 2;
        const mask = m(geo.mask, mat.pants, 0, 2.0, -0.2);
        mask.rotation.x = Math.PI / 2;
        mask.rotation.z = Math.PI;
        if (p.number !== null) {
          const numMat = keep(new THREE.MeshBasicMaterial({ map: keep(numberTexture(p.number, light ? "#141c28" : "#ffffff")), transparent: true, depthWrite: false }));
          const num = m(geo.num, numMat, 0, 1.3, 0.335);
          num.renderOrder = 2;
        }
      }
      // Linemen stehen tiefer und leicht nach vorn geneigt
      if (p.down) {
        body.scale.y = 0.9;
        body.rotation.x = -0.16;
      }
      const blob = new THREE.Mesh(geo.blob, mat.blob);
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 0.03;
      group.add(blob);
      const ring = new THREE.Mesh(geo.ring, keep(mat.ring.clone()));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);
      const hit = new THREE.Mesh(geo.hit, mat.hit);
      hit.position.y = 1.3;
      hit.userData.index = index;
      group.add(hit);
      // Offense blickt in Spielrichtung (-z), Defense zur Offense (+z): Die Kamera steht jeweils dahinter.
      group.rotation.y = p.unit === "defense" ? Math.PI : 0;
      group.position.set(p.x * 1.0, 0, p.z);
      group.scale.setScalar(1.18);
      scene.add(group);
      return { group, body, ring, jersey, hit, index, unit: p.unit, lift: 0, phase: index * 1.7 };
    });

    // Kamera: steht hinter der gewaehlten Einheit; Wechsel als Schwenk um das Feld
    let angle = state.current.unit === "offense" ? 0 : Math.PI;
    let fade = state.current.unit === "offense" ? 0 : 1; // 0 = Offense sichtbar, 1 = Defense
    const placeCamera = (t: number) => {
      const narrow = el.clientWidth < 560;
      const dist = narrow ? 27 : 27;
      const height = narrow ? 22 : 15;
      const sway = reduced ? 0 : Math.sin(t * 0.25) * 0.5;
      camera.position.set(Math.sin(angle) * dist + Math.cos(angle) * sway, height, Math.cos(angle) * dist + 3 * Math.cos(angle));
      camera.lookAt(0, 0.4, -Math.cos(angle) * (narrow ? -1 : 3.5));
    };

    const size = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / Math.max(1, h);
      camera.fov = w < 560 ? 62 : 38;
      camera.updateProjectionMatrix();
      invalidate();
    };

    // Zeichnen: laufend nur, wenn sichtbar und Bewegung erlaubt; sonst auf Anforderung
    let raf = 0;
    let visible = true;
    let dirty = true;
    const clock = new THREE.Clock();
    const frame = () => {
      raf = 0;
      const dt = Math.min(clock.getDelta(), 0.1);
      const t = clock.elapsedTime;
      // zeitbasiertes Angleichen, damit Uebergaenge auf langsamen Geraeten gleich lang dauern
      const ease = (rate: number) => 1 - Math.exp(-dt * rate);
      const target = state.current.unit === "offense" ? 0 : Math.PI;
      const moving = Math.abs(target - angle) > 0.002;
      if (moving) angle = reduced ? target : angle + (target - angle) * ease(4.5);
      const fadeTarget = state.current.unit === "offense" ? 0 : 1;
      fade = reduced ? fadeTarget : fade + (fadeTarget - fade) * ease(6);
      let settling = moving || Math.abs(fadeTarget - fade) > 0.01;
      for (const f of figures) {
        const show = f.unit === "offense" ? 1 - fade : fade;
        f.group.visible = show > 0.02;
        const on = state.current.active === f.index;
        const liftTarget = on ? 1 : 0;
        f.lift = reduced ? liftTarget : f.lift + (liftTarget - f.lift) * ease(14);
        if (Math.abs(liftTarget - f.lift) > 0.01) settling = true;
        const s = (el.clientWidth < 560 ? 1.7 : 1.18) * (0.6 + 0.4 * show) * (1 + 0.1 * f.lift);
        f.group.scale.setScalar(s);
        f.body.position.y = f.lift * 0.12 + (reduced ? 0 : Math.sin(t * 1.4 + f.phase) * 0.012);
        (f.ring.material as THREE.MeshBasicMaterial).opacity = f.lift * 0.95;
        if (f.jersey) f.jersey.emissiveIntensity = f.lift * 0.16;
        f.hit.visible = f.unit === state.current.unit;
      }
      (los.material as THREE.MeshBasicMaterial).opacity = reduced ? 0.12 : 0.1 + Math.sin(t * 1.6) * 0.05;
      if (decal) {
        decal.rotation.y = angle;
        decal.position.z = -11 * Math.cos(angle);
      }
      placeCamera(t);
      renderer.render(scene, camera);
      dirty = false;
      if (visible && (!reduced || settling)) raf = requestAnimationFrame(frame);
    };
    const invalidate = () => {
      dirty = true;
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    api.current = { invalidate };

    const ro = new ResizeObserver(size);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && (dirty || !reduced)) invalidate();
    });
    io.observe(el);

    // Maus und Touch
    const ray = new THREE.Raycaster();
    const pick = (ev: PointerEvent): number | null => {
      const r = renderer.domElement.getBoundingClientRect();
      const v = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(v, camera);
      const hits = ray.intersectObjects(figures.filter((f) => f.hit.visible && players[f.index].id).map((f) => f.hit), false);
      return hits.length ? (hits[0].object.userData.index as number) : null;
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerType === "touch") return;
      const i = pick(ev);
      renderer.domElement.style.cursor = i === null ? "default" : "pointer";
      if (i !== state.current.active) state.current.onActive(i);
    };
    // Touch: pointerleave folgt direkt auf das Loslassen und wuerde die Auswahl sofort wieder aufheben
    const leave = (ev: PointerEvent) => ev.pointerType !== "touch" && state.current.onActive(null);
    let downAt: [number, number] | null = null;
    const down = (ev: PointerEvent) => (downAt = [ev.clientX, ev.clientY]);
    const up = (ev: PointerEvent) => {
      if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 8) return; // gewischt, nicht getippt
      const i = pick(ev);
      if (i === null) return state.current.onActive(null);
      // Touch: erster Tipp waehlt aus (Infotafel), zweiter oeffnet das Profil
      if (ev.pointerType === "touch" && state.current.active !== i) return state.current.onActive(i);
      state.current.onOpen(i);
    };
    const cv = renderer.domElement;
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerleave", leave);
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointerup", up);
    const lost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    cv.addEventListener("webglcontextlost", lost);

    size();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerleave", leave);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("webglcontextlost", lost);
      disposed = true;
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      cv.remove();
      api.current = null;
    };
  }

  // Wechsel der Einheit oder des aktiven Spielers: neu zeichnen (wichtig bei reduzierter Bewegung)
  useEffect(() => {
    api.current?.invalidate();
  }, [unit, active]);

  return <div ref={mount} className="absolute inset-0" aria-hidden="true" />;
}

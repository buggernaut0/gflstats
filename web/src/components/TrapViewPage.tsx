"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

/**
 * Trap View + Simulator (src/trapview). Nur im Browser (WebGL, Audio) und erst auf dieser Seite geladen:
 * three.js, die 3D-Szene und die Simulationsdaten landen in eigenen Chunks und belasten keine andere Seite.
 */
const TrapViewApp = dynamic(() => import("@/trapview/App").then((m) => m.App), {
  ssr: false,
  loading: () => <div className="trapview-loading">Lade Trap View …</div>,
});

/** Füllt den sichtbaren Bereich unter der Kopfzeile; deren Höhe wird gemessen (sie bricht mobil um). */
export default function TrapViewPage() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("body > header");
    const el = host.current;
    if (!header || !el) return;
    // Vollbild-Ansicht: die Seite selbst scrollt nicht (der Simulator scrollt in sich), Fußzeile ausgeblendet
    const root = document.documentElement;
    root.classList.add("trapview-page");
    window.scrollTo(0, 0);
    const apply = () => el.style.setProperty("--site-header-h", `${header.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(header);
    return () => {
      ro.disconnect();
      root.classList.remove("trapview-page");
    };
  }, []);
  return (
    <main ref={host} className="trapview-host" aria-label="Trap View">
      <TrapViewApp />
    </main>
  );
}

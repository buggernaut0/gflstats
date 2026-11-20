"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Vollbild-Bereich unter der Kopfzeile für Trap View und Simulator; die Höhe der Kopfzeile wird
 * gemessen (sie bricht mobil um). Die Seite selbst scrollt nicht, die Fußzeile ist ausgeblendet –
 * die Anwendung darin scrollt bei Bedarf selbst.
 */
export default function FullscreenHost({ label, children }: { label: string; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("body > header");
    const el = host.current;
    if (!header || !el) return;
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
    <main ref={host} className="trapview-host" aria-label={label}>
      {children}
    </main>
  );
}

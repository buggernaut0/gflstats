"use client";

import dynamic from "next/dynamic";
import FullscreenHost from "./FullscreenHost";

/**
 * Trap View (src/trapview). Nur im Browser (WebGL, Audio) und erst auf dieser Seite geladen:
 * three.js und die 3D-Szene landen in eigenen Chunks und belasten keine andere Seite.
 */
const TrapViewApp = dynamic(() => import("@/trapview/App").then((m) => m.App), {
  ssr: false,
  loading: () => <div className="trapview-loading">Lade Trap View …</div>,
});

export default function TrapViewPage() {
  return (
    <FullscreenHost label="Trap View">
      <TrapViewApp />
    </FullscreenHost>
  );
}

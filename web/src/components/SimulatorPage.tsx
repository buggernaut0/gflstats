"use client";

import dynamic from "next/dynamic";
import FullscreenHost from "./FullscreenHost";

/** Spielsimulator (src/trapview/simview). Nur im Browser und erst auf dieser Seite geladen. */
const SimApp = dynamic(() => import("@/trapview/SimApp").then((m) => m.SimApp), {
  ssr: false,
  loading: () => <div className="trapview-loading">Lade Simulator …</div>,
});

export default function SimulatorPage() {
  return (
    <FullscreenHost label="Spielsimulator">
      <SimApp />
    </FullscreenHost>
  );
}

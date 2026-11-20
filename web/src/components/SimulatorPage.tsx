"use client";

import dynamic from "next/dynamic";
import FullscreenHost from "./FullscreenHost";
import { T, useI18n } from "@/i18n/react";

/** Spielsimulator (src/trapview/simview). Nur im Browser und erst auf dieser Seite geladen. */
const SimApp = dynamic(() => import("@/trapview/SimApp").then((m) => m.SimApp), {
  ssr: false,
  loading: () => <div className="trapview-loading"><T k="simui.loading" /></div>,
});

export default function SimulatorPage() {
  const { m } = useI18n();
  return (
    <FullscreenHost label={m.simui.host}>
      <SimApp />
    </FullscreenHost>
  );
}

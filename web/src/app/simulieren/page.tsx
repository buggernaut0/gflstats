import type { Metadata } from "next";
import SimulatorPage from "@/components/SimulatorPage";

export const metadata: Metadata = {
  title: "Spiel simulieren",
  description: "Zwei GFL-Teams, ein komplettes Spiel: Simulation aus den echten Werten der Saison 2026 – inklusive Siegchance über 1.000 Simulationen.",
};

export default function Page() {
  return <SimulatorPage />;
}

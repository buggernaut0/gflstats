import type { Metadata } from "next";
import TrapViewPage from "@/components/TrapViewPage";

export const metadata: Metadata = {
  title: "Trap View",
  description: "Zwei GFL-Teams im 3D-Matchup mit echten Starting Lineups – und daraus eine komplette Spielsimulation der Saison 2026.",
};

export default function Page() {
  return <TrapViewPage />;
}

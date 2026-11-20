import type { Metadata } from "next";
import TrapViewPage from "@/components/TrapViewPage";

export const metadata: Metadata = {
  title: "Trap View",
  description: "Zwei GFL-Teams im 3D-Matchup mit echten Starting Lineups – Formation, Duelle und Schlüsselspieler im Broadcast-Stil.",
};

export default function Page() {
  return <TrapViewPage />;
}

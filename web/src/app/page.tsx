import SeasonDashboard from "@/components/SeasonDashboard";
import { getMeta } from "@/lib/data";

export default function Home() {
  return <SeasonDashboard season={getMeta().currentSeason} />;
}

import type { Metadata } from "next";
import SeasonDashboard from "@/components/SeasonDashboard";
import { getMeta } from "@/lib/data";

export function generateStaticParams() {
  return getMeta().seasons.map((s) => ({ season: String(s) }));
}

export async function generateMetadata({ params }: { params: Promise<{ season: string }> }): Promise<Metadata> {
  const { season } = await params;
  return { title: `Saison ${season}` };
}

export default async function SeasonPage({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  return <SeasonDashboard season={Number(season)} />;
}

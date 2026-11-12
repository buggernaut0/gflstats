"use client";

import Radar from "./Radar";

/** Perzentil-Profil eines Spielers in seiner Rolle (eine Serie, mit Liga-Median). */
export default function ProfileRadar({ name, axes }: { name: string; axes: { label: string; pct: number | null; raw: string }[] }) {
  return <Radar axes={axes.map((a) => a.label)} series={[{ name, pct: axes.map((a) => a.pct), raw: axes.map((a) => a.raw) }]} size={380} medianLabel="Median der Vergleichsgruppe (50. Perzentil)" />;
}

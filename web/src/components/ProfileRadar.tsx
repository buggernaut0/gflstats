"use client";

import Radar from "./Radar";
import { stat } from "@/lib/stats";
import { useI18n } from "@/i18n/react";

/** Perzentil-Profil eines Spielers in seiner Rolle (eine Serie, mit Liga-Median). */
export default function ProfileRadar({ name, axes }: { name: string; axes: { key: string; pct: number | null; value: number | null }[] }) {
  const f = useI18n();
  const raw = axes.map((a) => (a.value === null ? f.m.common.notRecordedLong : f.fmtStat(stat(a.key), a.value)));
  return <Radar axes={axes.map((a) => f.statLabel(a.key))} series={[{ name, pct: axes.map((a) => a.pct), raw }]} size={380} medianLabel={f.m.player.medianGroupPct} />;
}

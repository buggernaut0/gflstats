import { ALL_SEASONS } from "@/lib/seasonFilter";

/** Optionen des Saisonfilters: aktuelle Saison zuerst (Standard), dann ältere absteigend, zuletzt alle Saisons. */
export default function SeasonOptions({ seasons, current }: { seasons: number[]; current: number }) {
  return (
    <>
      <option value="">{current} (aktuell)</option>
      {[...seasons].sort((a, b) => b - a).filter((s) => s !== current).map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
      <option value={ALL_SEASONS}>Alle Saisons</option>
    </>
  );
}

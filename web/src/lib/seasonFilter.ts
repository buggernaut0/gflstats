/**
 * Saisonfilter der Listen und Suchen (Spieler, Spiele, Teams) – eine Regel für die ganze Website:
 * Standard ist die aktuelle Saison (meta.currentSeason), ältere Saisons und „alle Saisons“ bleiben wählbar.
 *
 * Wert im Zustand und in der Adresse (?saison=…):
 *   ""          – aktuelle Saison (Standard, steht nicht in der Adresse)
 *   "alle"      – alle Saisons
 *   "2024" usw. – diese Saison
 */
export const ALL_SEASONS = "alle";

/** Gefilterte Saison oder null für „alle Saisons“. */
export function seasonOfFilter(value: string, current: number): number | null {
  if (value === ALL_SEASONS) return null;
  const n = Number(value);
  return value && Number.isFinite(n) ? n : current;
}

/** Wert für das Auswahlfeld: die aktuelle Saison steht immer als "" (auch bei ?saison=<aktuell> in alten Links). */
export function seasonSelectValue(value: string, current: number): string {
  return value === String(current) ? "" : value;
}

/**
 * Feldmaße und die einzige Umrechnung von Formations-Yards in Weltkoordinaten.
 * Welt: 1 Einheit = 1 Yard, +X = Angriffsrichtung, +Z = rechts aus Sicht der Offense, +Y = oben.
 * Das Feld liegt mittig im Ursprung.
 */
export const FIELD = {
  /** Gesamtlänge inklusive beider Endzonen. */
  length: 120,
  width: 160 / 3,
  endzone: 10,
  /** Abstand der Hashmarks von der Seitenlinie (NCAA-Regelwerk, wie in der GFL). */
  hashFromSideline: 20,
  /** Abstand Oberkante der Yard-Zahlen von der Seitenlinie. */
  numbersFromSideline: 9,
  border: 2,
} as const;

/** Welt-X der Line of Scrimmage für einen Ball auf Yard-Linie `ballOn` (0–100). */
export function losWorldX(ballOn: number): number {
  return ballOn - 50;
}

/** Formation (x quer, y längs, relativ zum Ball) → Weltposition am Boden. */
export function toWorld(ballOn: number, x: number, y: number): [number, number, number] {
  return [losWorldX(ballOn) + y, 0, x];
}

/** Blickrichtung in Grad (0 = Angriffsrichtung) → Rotation um die Y-Achse. */
export function facingToRotationY(facingDeg: number): number {
  return Math.PI / 2 + (facingDeg * Math.PI) / 180;
}

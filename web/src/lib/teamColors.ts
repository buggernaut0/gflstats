/**
 * Hilfen rund um die Teamfarben. Die Farben selbst stehen ausschließlich in curation/teams.json
 * (über scripts/build_data.py bzw. scripts/trapview/export-data.ts in die Website-Daten übernommen) –
 * hier werden sie nur gelesen und für die Anzeige ausgewählt, nie festgelegt.
 */

/** Abweichende Farben des dunklen Heimtrikots, wenn es nicht einfach die Hauptfarbe trägt (z. B. schwarzes Trikot, roter Helm). */
export interface TeamKitColors {
  jersey?: string;
  /** Kragen, Ärmelabschluss, Streifen (sonst die Zweitfarbe) */
  trim?: string;
  helmet?: string;
  facemask?: string;
  number?: string;
  numberOutline?: string;
  pants?: string;
}

/** Teamfarben, wie sie in curation/teams.json stehen. */
export interface TeamColorSpec {
  primary: string;
  secondary?: string;
  /** optionaler Akzent für Oberflächen (z. B. Gold bei Rot/Schwarz) */
  accent?: string;
  kit?: TeamKitColors;
  source?: string | null;
  note?: string;
}

/** Relative Leuchtdichte nach WCAG (0 = schwarz, 1 = weiß); ungültige Werte zählen als mittelgrau. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.2;
  const n = parseInt(m[1], 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const u = v / 255;
    return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Kontrastverhältnis zweier Farben nach WCAG (1–21). */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Akzentfarbe eines Teams, die sich auf dem gegebenen Hintergrund abhebt: der Reihe nach Hauptfarbe,
 * Zweitfarbe, Akzent – die erste mit ausreichend Kontrast. So erscheinen Teams mit schwarzer oder
 * Navy-Hauptfarbe (Berlin Rebels, Dresden Monarchs …) auf dunklem Grund in ihrer Zweitfarbe statt unsichtbar.
 */
export function teamAccent(c: TeamColorSpec, background = "#0b1018", minContrast = 2.2): string {
  const order = [c.primary, c.secondary, c.accent].filter((x): x is string => !!x);
  return order.find((x) => contrast(x, background) >= minContrast) ?? order.sort((p, q) => contrast(q, background) - contrast(p, background))[0];
}

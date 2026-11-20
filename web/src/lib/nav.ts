/**
 * Hauptnavigation. Leaders, Rekorde und Vergleich sind ueber den Analytics-Hub erreichbar (Adressen unveraendert).
 * label = deutscher Standardtext, key = Eintrag unter nav in src/i18n (angezeigt wird der Text der gewaehlten Sprache).
 */
export const NAV: { href: string; label: string; key: "players" | "teams" | "games" | "analytics" | "trapView" | "simulate"; also?: string[] }[] = [
  { href: "/spieler/", label: "Spieler", key: "players" },
  { href: "/teams/", label: "Teams", key: "teams" },
  { href: "/spiele/", label: "Spiele", key: "games" },
  { href: "/analytics/", label: "Analytics", key: "analytics", also: ["/leaders", "/rekorde", "/vergleich"] },
  { href: "/trap-view/", label: "Trap View", key: "trapView" },
  { href: "/simulieren/", label: "Simulieren", key: "simulate" },
];

export function isActive(path: string, item: { href: string; also?: string[] }): boolean {
  return [item.href.replace(/\/$/, ""), ...(item.also ?? [])].some((base) => path === base || path.startsWith(`${base}/`));
}

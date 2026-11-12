/** Hauptnavigation. Leaders, Rekorde und Vergleich sind ueber den Analytics-Hub erreichbar (Adressen unveraendert). */
export const NAV = [
  { href: "/spieler/", label: "Spieler" },
  { href: "/teams/", label: "Teams" },
  { href: "/spiele/", label: "Spiele" },
  { href: "/analytics/", label: "Analytics", also: ["/leaders", "/rekorde", "/vergleich"] },
];

export function isActive(path: string, item: { href: string; also?: string[] }): boolean {
  return [item.href.replace(/\/$/, ""), ...(item.also ?? [])].some((base) => path === base || path.startsWith(`${base}/`));
}

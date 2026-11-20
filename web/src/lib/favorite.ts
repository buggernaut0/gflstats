/**
 * Lieblingsteam: zentrale Logik.
 *
 * Speicherung: localStorage (bleibt nach dem Schliessen des Browsers erhalten, kein Backend).
 * Hervorhebung: rein ueber CSS. Jedes Element, das Spieler oder Teams zeigt, traegt die Team-IDs
 * seines Datensatzes in data-teams (siehe teamsAttr). Fuer das gewaehlte Team schreibt favoriteCss()
 * Regeln in <style id="fav-style">; zusaetzlich steht die ID als data-fav-team am <html>-Element.
 * Dadurch funktioniert die Hervorhebung ueberall gleich - auch in Server-Komponenten, nach Sortieren
 * und Filtern - und es entstehen keine Hydration-Unterschiede.
 */

export const FAVORITE_KEY = "gfl-favorite-team";
/** Gesetzt, sobald die Begrüßung (FavoriteWelcome) beantwortet wurde – gewählt oder übersprungen. */
export const FAVORITE_ASKED_KEY = "gfl-favorite-asked";
export const FAVORITE_EVENT = "gfl-favorite-change";
export const FAVORITE_STYLE_ID = "fav-style";
const VALID = /^[a-z0-9-]{2,60}$/;

export function sanitizeTeamId(value: unknown): string | null {
  return typeof value === "string" && VALID.test(value) ? value : null;
}

export function readFavorite(): string | null {
  try {
    return sanitizeTeamId(localStorage.getItem(FAVORITE_KEY));
  } catch {
    return null; // Speicher nicht verfuegbar (z. B. privater Modus)
  }
}

/**
 * Markierungsfarbe je Team und Design: [dunkles Design, helles Design]. Kommt aus den Teamfarben in
 * curation/teams.json (lib/teamColors.ts teamAccent) und steht als window.__GFL_FAV_COLORS bereit
 * (gesetzt im <head>, siehe favoriteInitScript). Teams ohne belegte Farben behalten das neutrale Violett.
 */
export type FavoriteColors = Record<string, [string, string]>;
const HEX = /^#[0-9a-f]{6}$/i;

declare global {
  interface Window {
    __GFL_FAV_COLORS?: FavoriteColors;
  }
}

function colorRules(pair: [string, string] | undefined): string {
  if (!pair || !HEX.test(pair[0]) || !HEX.test(pair[1])) return "";
  const [dark, light] = pair;
  return (
    `:root[data-theme="dark"]{--fav:${dark};--fav-tint:color-mix(in srgb,${dark} 11%,transparent)}` +
    `:root[data-theme="light"]{--fav:${light};--fav-tint:color-mix(in srgb,${light} 8%,transparent)}`
  );
}

/**
 * Regeln fuer genau ein Team: Zeilen und Karten dieses Teams bekommen einen Streifen links und eine
 * leichte Toenung in den Teamfarben, das Kennzeichen "Dein Team" wird sichtbar. Es gilt das Team des
 * jeweiligen Datensatzes (Saison, Spiel), nicht ein festes Karriereteam.
 */
export function favoriteCss(team: string, colors?: [string, string]): string {
  const id = sanitizeTeamId(team);
  if (!id) return "";
  const el = `[data-teams~="${id}"]`;
  const area = `${el}:not(.fav-plain)`; // .fav-plain: nur Kennzeichen, keine Flaechenmarkierung
  return [
    // Toenung als Bild-Ebene: die eigene Hintergrundfarbe (Karte, Hover) bleibt darunter erhalten
    `${area}{background-image:linear-gradient(var(--fav-tint),var(--fav-tint))}`,
    `${area}:not(tr){box-shadow:inset 3px 0 0 var(--fav)}`,
    `tr${el}>:first-child{box-shadow:inset 3px 0 0 var(--fav)}`,
    `${el} .fav-badge{display:inline-flex}`,
    colorRules(colors),
  ].join("");
}

/** Setzt Attribut und Stilregeln fuer das gewaehlte Team (oder entfernt beides). */
export function applyFavorite(team: string | null): void {
  const id = sanitizeTeamId(team);
  const root = document.documentElement;
  if (id) root.dataset.favTeam = id;
  else delete root.dataset.favTeam;
  const style = document.getElementById(FAVORITE_STYLE_ID);
  if (style) style.textContent = id ? favoriteCss(id, window.__GFL_FAV_COLORS?.[id]) : "";
}

export function writeFavorite(team: string | null): void {
  const id = sanitizeTeamId(team);
  try {
    localStorage.setItem(FAVORITE_ASKED_KEY, "1");
    if (id) localStorage.setItem(FAVORITE_KEY, id);
    else localStorage.removeItem(FAVORITE_KEY);
  } catch {
    /* Auswahl gilt dann nur bis zum Neuladen */
  }
  applyFavorite(id);
  window.dispatchEvent(new Event(FAVORITE_EVENT));
}

/** Begrüßung schon beantwortet (gewählt oder übersprungen)? */
export function favoriteAsked(): boolean {
  try {
    return localStorage.getItem(FAVORITE_ASKED_KEY) === "1" || readFavorite() !== null;
  } catch {
    return true; // ohne Speicher nicht bei jedem Seitenaufruf fragen
  }
}

/** Begrüßung ohne Auswahl schliessen – sie erscheint danach nicht wieder (Team bleibt oben rechts waehlbar). */
export function markFavoriteAsked(): void {
  try {
    localStorage.setItem(FAVORITE_ASKED_KEY, "1");
  } catch {
    /* nur fuer diese Seite */
  }
}

/**
 * Laeuft im <head> direkt nach dem leeren <style id="fav-style"> und vor dem ersten Zeichnen, damit die
 * Markierung nicht nachtraeglich aufblitzt. Die Regeln stammen aus favoriteCss (keine doppelte Logik);
 * die Teamfarben kommen als Tabelle mit (nur geprüfte IDs und Hex-Werte).
 */
export function favoriteInitScript(colors: FavoriteColors): string {
  const safe: FavoriteColors = {};
  for (const [id, pair] of Object.entries(colors)) {
    if (sanitizeTeamId(id) && HEX.test(pair[0]) && HEX.test(pair[1])) safe[id] = pair;
  }
  const base = JSON.stringify(favoriteCss("team-id"));
  const rules = JSON.stringify(colorRules(["#000001", "#000002"]));
  return (
    `window.__GFL_FAV_COLORS=${JSON.stringify(safe)};` +
    `try{var f=localStorage.getItem(${JSON.stringify(FAVORITE_KEY)});` +
    `if(f&&${VALID}.test(f)){document.documentElement.dataset.favTeam=f;` +
    `var c=window.__GFL_FAV_COLORS[f],s=document.getElementById(${JSON.stringify(FAVORITE_STYLE_ID)});` +
    `if(s)s.textContent=${base}.split("team-id").join(f)+(c?${rules}.split("#000001").join(c[0]).split("#000002").join(c[1]):"")}}catch(e){}`
  );
}

/** Attribut fuer Elemente, die zu einem oder mehreren Teams gehoeren (Team des jeweiligen Datensatzes). */
export function teamsAttr(teams: string | string[] | undefined | null): { "data-teams"?: string } {
  const list = (Array.isArray(teams) ? teams : teams ? [teams] : []).filter(Boolean);
  return list.length ? { "data-teams": list.join(" ") } : {};
}

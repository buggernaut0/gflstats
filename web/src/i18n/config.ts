/**
 * Sprachen der Website. Deutsch ist Standard; die Wahl liegt im Browser (localStorage) und wird vor dem
 * ersten Zeichnen als <html lang> gesetzt (langInitScript). Weitere Sprachen: hier eintragen, dazu einen
 * Ordner unter src/i18n/ mit denselben Dateien wie de/ – der Typ in messages.ts erzwingt Vollständigkeit.
 */
export const LANGS = ["de", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "de";
export const LANG_STORAGE_KEY = "gfl-lang";

/** Intl-Locale je Sprache (Zahlen, Datum, Sortierung). */
export const LOCALE: Record<Lang, string> = { de: "de-DE", en: "en-US" };

export const LANG_NAME: Record<Lang, string> = { de: "Deutsch", en: "English" };

export function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (LANGS as readonly string[]).includes(x);
}

/** Inline-Skript im <head>: gespeicherte Sprache vor dem ersten Zeichnen setzen. */
export const langInitScript = `try{var l=localStorage.getItem("${LANG_STORAGE_KEY}");if(${JSON.stringify(LANGS)}.indexOf(l)>=0)document.documentElement.lang=l}catch(e){}`;

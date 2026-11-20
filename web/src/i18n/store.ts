/**
 * Aktuelle Sprache im Browser: steht in <html lang> (vom Init-Skript vor dem ersten Zeichnen gesetzt) und in
 * localStorage. Ein Wechsel schreibt beides und benachrichtigt alle Komponenten – ohne Neuladen, ohne dass
 * Seite, Filter oder Auswahl verloren gehen. Beim statischen Build gilt immer DEFAULT_LANG.
 */
import { DEFAULT_LANG, LANG_STORAGE_KEY, isLang, type Lang } from "./config";

const listeners = new Set<() => void>();

export function getLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  const l = document.documentElement.lang;
  return isLang(l) ? l : DEFAULT_LANG;
}

export function setLang(lang: Lang) {
  if (typeof document === "undefined" || lang === getLang()) return;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* Speichern nicht möglich (privater Modus) – Wahl gilt nur für diesen Besuch */
  }
  listeners.forEach((l) => l());
}

export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  // Wechsel in einem anderen Tab übernehmen
  const onStorage = (e: StorageEvent) => {
    if (e.key === LANG_STORAGE_KEY && isLang(e.newValue) && e.newValue !== getLang()) {
      document.documentElement.lang = e.newValue;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

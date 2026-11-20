/**
 * Zahlen- und Datumsformate. Ohne Sprachangabe Deutsch (statischer Build); Client-Komponenten bekommen
 * über useI18n() (src/i18n/react.tsx) dieselben Funktionen an die gewählte Sprache gebunden.
 */
import { LOCALE, type Lang } from "../i18n/config.ts";

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function nf(lang: Lang, min: number, max: number): Intl.NumberFormat {
  const key = `n|${lang}|${min}|${max}`;
  let f = cache.get(key) as Intl.NumberFormat | undefined;
  if (!f) cache.set(key, (f = new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: min, maximumFractionDigits: max })));
  return f;
}
function df(lang: Lang, opts: Intl.DateTimeFormatOptions, id: string): Intl.DateTimeFormat {
  const key = `d|${lang}|${id}`;
  let f = cache.get(key) as Intl.DateTimeFormat | undefined;
  if (!f) cache.set(key, (f = new Intl.DateTimeFormat(LOCALE[lang], opts)));
  return f;
}

/** 1663 -> "1.663" (en: "1,663"); 2.5 -> "2,5" (en: "2.5"). Halbe (Sacks, Tackles) behalten eine Nachkommastelle. */
export function fmt(value: number | null | undefined, lang: Lang = "de"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return Number.isInteger(value) ? nf(lang, 0, 0).format(value) : nf(lang, 1, 1).format(value);
}

/** Feste Nachkommastellen, z. B. fuer Durchschnittswerte. */
export function fmtDec(value: number | null | undefined, digits = 1, lang: Lang = "de"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return nf(lang, digits, digits).format(value);
}

export function fmtSigned(value: number, lang: Lang = "de"): string {
  if (value === 0) return "0";
  return (value > 0 ? "+" : "−") + nf(lang, 0, 0).format(Math.abs(value));
}

export const fmtDate = (iso: string, lang: Lang = "de") =>
  df(lang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }, "date").format(new Date(`${iso}T00:00:00Z`));

/** Zeitpunkt (ISO mit Zeitzone) als Datum in Berliner Zeit. */
export const fmtStamp = (isoDateTime: string, lang: Lang = "de") =>
  df(lang, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }, "stamp").format(new Date(isoDateTime));

export const fmtShortDate = (iso: string, lang: Lang = "de") =>
  df(lang, lang === "en" ? { month: "2-digit", day: "2-digit", timeZone: "UTC" } : { day: "2-digit", month: "2-digit", timeZone: "UTC" }, "short").format(new Date(`${iso}T00:00:00Z`));

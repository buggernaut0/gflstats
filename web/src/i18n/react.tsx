"use client";

/**
 * Sprache in React: useI18n() für Client-Komponenten, <T>, <Num> und <DateText> für Server-Komponenten
 * (die statisch gebaut werden und deshalb selbst keine Sprache kennen). Ein Sprachwechsel rendert alle
 * Stellen sofort neu – ohne Neuladen.
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_LANG, LANGS, LANG_NAME, LOCALE, type Lang } from "./config";
import { MESSAGES, resolveMessage, type MessagePath, type Messages } from "./messages";
import { getLang, setLang, subscribeLang } from "./store";
import { fmt, fmtDate, fmtDec, fmtShortDate, fmtSigned, fmtStamp } from "@/lib/format";
import { formatStat, stat, type StatDef } from "@/lib/stats";

export function useLang(): Lang {
  // Beim Hydrieren gilt die Sprache des statischen HTML (Deutsch), direkt danach die gewählte
  return useSyncExternalStore(subscribeLang, getLang, () => DEFAULT_LANG);
}

export interface I18n {
  lang: Lang;
  locale: string;
  /** Texte der aktuellen Sprache, typisiert: m.nav.players, m.player.games(3) */
  m: Messages;
  /** Text über seinen Pfad (selten nötig, m ist bequemer) */
  t: (path: MessagePath, ...args: unknown[]) => string;
  fmt: (v: number | null | undefined) => string;
  fmtDec: (v: number | null | undefined, digits?: number) => string;
  fmtSigned: (v: number) => string;
  fmtDate: (iso: string) => string;
  fmtShortDate: (iso: string) => string;
  fmtStamp: (iso: string) => string;
  /** Kennzahl formatieren (Nachkommastellen, Prozent) */
  fmtStat: (def: StatDef, v: number | null | undefined) => string;
  /** Kennzahl-Name, Abkürzung, Formel in der gewählten Sprache */
  statLabel: (def: StatDef | string) => string;
  statAbbr: (def: StatDef | string) => string;
}

export function i18nFor(lang: Lang): I18n {
  const m = MESSAGES[lang];
  return {
    lang,
    locale: LOCALE[lang],
    m,
    t: (path, ...args) => resolveMessage(m, path, args),
    fmt: (v) => fmt(v, lang),
    fmtDec: (v, d = 1) => fmtDec(v, d, lang),
    fmtSigned: (v) => fmtSigned(v, lang),
    fmtDate: (iso) => fmtDate(iso, lang),
    fmtShortDate: (iso) => fmtShortDate(iso, lang),
    fmtStamp: (iso) => fmtStamp(iso, lang),
    fmtStat: (def, v) => formatStat(def, v, lang),
    statLabel: (def) => m.stats.label(typeof def === "string" ? stat(def) : def),
    statAbbr: (def) => m.stats.abbr(typeof def === "string" ? stat(def) : def),
  };
}

export function useI18n(): I18n {
  const lang = useLang();
  return useMemo(() => i18nFor(lang), [lang]);
}

/** Text für Server-Komponenten: <T k="nav.players" /> bzw. mit Werten <T k="player.games" a={[12]} />. */
export function T({ k, a }: { k: MessagePath; a?: unknown[] }) {
  const { t } = useI18n();
  return <>{t(k, ...(a ?? []))}</>;
}

/** Zahl im Format der gewählten Sprache (Server-Komponenten). digits weglassen = ganze Zahl bzw. Halbe mit einer Stelle. */
export function Num({ v, digits, signed }: { v: number | null | undefined; digits?: number; signed?: boolean }) {
  const f = useI18n();
  if (signed && v != null) return <>{f.fmtSigned(v)}</>;
  return <>{digits === undefined ? f.fmt(v) : f.fmtDec(v, digits)}</>;
}

/** Kennzahl-Name für Server-Komponenten: <StatLabel k="passingyards" /> (abbr = Kurzform). */
export function StatLabel({ k, abbr }: { k: string; abbr?: boolean }) {
  const f = useI18n();
  return <>{abbr ? f.statAbbr(k) : f.statLabel(k)}</>;
}

/** Kennzahl-Wert für Server-Komponenten (Nachkommastellen und Prozent wie im Katalog). */
export function StatValue({ k, v }: { k: string; v: number | null | undefined }) {
  const f = useI18n();
  return <>{f.fmtStat(stat(k), v)}</>;
}

/** Datum im Format der gewählten Sprache (Server-Komponenten). */
export function DateText({ iso, kind = "date" }: { iso: string; kind?: "date" | "short" | "stamp" }) {
  const f = useI18n();
  return <>{kind === "short" ? f.fmtShortDate(iso) : kind === "stamp" ? f.fmtStamp(iso) : f.fmtDate(iso)}</>;
}

/**
 * Für Englisch gespeichert, aber deutsches HTML ausgeliefert: bis die Seite auf Englisch umgestellt ist, bleibt
 * sie unsichtbar (CSS in globals.css, mit Notausgang nach kurzer Zeit). Diese Komponente gibt sie frei.
 */
export function I18nReady() {
  const lang = useLang();
  useEffect(() => {
    const id = requestAnimationFrame(() => document.documentElement.setAttribute("data-i18n", "ready"));
    return () => cancelAnimationFrame(id);
  }, [lang]);
  useTitleSync(lang);
  return null;
}

const TITLE_SUFFIX = " · GFL Analytics";

/**
 * Seitentitel im Browser-Tab: Next setzt ihn aus den (deutschen) Metadaten der Seite; bei Englisch wird der
 * Seitenname über shell.pageTitles übersetzt. Namen von Spielern und Teams bleiben, wie sie sind.
 */
function useTitleSync(lang: Lang) {
  useEffect(() => {
    let original = document.title;
    let lastSet = "";
    const apply = () => {
      if (document.title !== lastSet) original = document.title;
      const map = MESSAGES[lang].shell.pageTitles;
      const [page, rest] = original.endsWith(TITLE_SUFFIX) ? [original.slice(0, -TITLE_SUFFIX.length), TITLE_SUFFIX] : [original, ""];
      // Datum im Titel (Box Score: „09.05.2026“) im Format der Sprache
      const translated = map[page] ?? (lang === "en" ? page.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, "$2/$1/$3") : page);
      const next = translated + rest;
      if (next !== document.title) {
        lastSet = next;
        document.title = next;
      } else lastSet = next;
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      obs.disconnect();
      if (document.title === lastSet) document.title = original;
    };
  }, [lang]);
}

/** Sprachwahl DE | EN in der Kopfzeile. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, m } = useI18n();
  return (
    <div role="group" aria-label={m.common.language} className={`flex items-center rounded-md border border-line p-0.5 ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => setLang(l)}
          aria-pressed={l === lang}
          title={LANG_NAME[l]}
          className={`h-7 min-w-[32px] rounded px-1.5 text-[12.5px] font-semibold uppercase tracking-wide transition-colors ${
            l === lang ? "bg-surface-2 text-ink shadow-[inset_0_-2px_0_var(--accent)]" : "text-ink-3 hover:text-ink"
          }`}
        >
          {l}
          <span className="sr-only"> – {LANG_NAME[l]}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Element mit übersetztem Tooltip (title) für Server-Komponenten: <Titled k="player.gamesHint">…</Titled>,
 * stat="passingyards" = Name und Formel der Kennzahl.
 */
export function Titled({ k, a, stat: statKey, as: Tag = "span", className, children }: {
  k?: MessagePath;
  a?: unknown[];
  stat?: string;
  as?: "span" | "div" | "td" | "th" | "p";
  className?: string;
  children?: React.ReactNode;
}) {
  const f = useI18n();
  let title: string | undefined;
  if (k) title = f.t(k, ...(a ?? []));
  else if (statKey) {
    const def = stat(statKey);
    const formula = f.m.stats.formula(def);
    title = formula ? `${f.statLabel(def)}: ${formula}` : f.statLabel(def);
  }
  return <Tag title={title} className={className}>{children}</Tag>;
}

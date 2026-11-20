"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FAVORITE_EVENT, FAVORITE_KEY, applyFavorite, favoriteAsked, markFavoriteAsked, readFavorite, writeFavorite } from "@/lib/favorite";
import TeamLogo, { type LogoTeam } from "./TeamLogo";
import { useI18n } from "@/i18n/react";

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === FAVORITE_KEY) {
      applyFavorite(readFavorite()); // Aenderung in einem anderen Tab nachziehen
      cb();
    }
  };
  window.addEventListener(FAVORITE_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(FAVORITE_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Zentraler Hook: aktuelles Lieblingsteam und Setter. Beim Server-Rendering und beim ersten
 * Client-Rendering ist der Wert null (keine Hydration-Unterschiede), danach der gespeicherte Wert.
 */
export function useFavoriteTeam(): [string | null, (team: string | null) => void] {
  const team = useSyncExternalStore(subscribe, readFavorite, () => null);
  return [team, writeFavorite];
}

export interface PickerTeam extends LogoTeam {
  id: string;
  short: string;
  current: boolean;
}

/** Auswahl des Lieblingsteams in der Kopfleiste. */
export default function FavoriteTeamPicker({ teams }: { teams: PickerTeam[] }) {
  const [fav, setFav] = useFavoriteTeam();
  const { m } = useI18n();
  const f = m.favorite;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const selected = teams.find((t) => t.id === fav);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const groups = [
    { label: f.groupCurrent, list: teams.filter((t) => t.current) },
    { label: f.groupFormer, list: teams.filter((t) => !t.current) },
  ];

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={selected ? f.current(selected.name) : f.title}
        className="flex h-9 items-center gap-2 rounded-md px-2 text-[14px] text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        {selected ? (
          <>
            <TeamLogo team={selected} size={24} />
            <span className="hidden font-medium text-ink xl:inline">{selected.short}</span>
          </>
        ) : (
          <>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" strokeLinejoin="round" />
            </svg>
            <span className="hidden xl:inline">{f.myTeam}</span>
          </>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label={f.title} className="absolute right-0 z-50 mt-1.5 w-[300px] overflow-hidden rounded-xl border border-line bg-surface shadow-xl shadow-black/30">
          <div className="border-b border-line px-4 py-3">
            {selected ? (
              <p className="flex items-center gap-2.5 text-[14px] text-ink">
                <TeamLogo team={selected} size={28} />
                <span className="min-w-0">
                  <span className="block text-[12px] text-ink-3">{f.yours}</span>
                  <span className="block truncate font-medium">{selected.name}</span>
                </span>
              </p>
            ) : (
              <p className="text-[13.5px] font-medium text-ink">{f.title}</p>
            )}
            <p className="mt-2 text-[12.5px] text-ink-2">
              {f.explain}
            </p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {groups.map((g) =>
              g.list.length ? (
                <div key={g.label}>
                  <p className="px-4 pb-1 pt-2.5 text-[12px] text-ink-3">{g.label}</p>
                  <ul>
                    {g.list.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          aria-pressed={t.id === fav}
                          onClick={() => {
                            setFav(t.id);
                            setOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-1.5 text-left text-[14px] hover:bg-surface-2 ${t.id === fav ? "bg-[var(--fav-tint)] text-ink" : "text-ink-2"}`}
                        >
                          <TeamLogo team={t} size={26} />
                          <span className="flex-1 truncate">{t.name}</span>
                          {t.id === fav && <span className="text-[12px] text-[var(--fav)]">{f.chosen}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
          {fav && (
            <button
              type="button"
              onClick={() => {
                setFav(null);
                setOpen(false);
              }}
              className="w-full border-t border-line px-4 py-2.5 text-left text-[13.5px] text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {f.remove}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Kleines Kennzeichen "Dein Team"; nur sichtbar, wenn ein umgebendes Element zum Lieblingsteam gehoert. */
export function FavBadge({ className = "" }: { className?: string }) {
  const { m } = useI18n();
  return (
    <span className={`fav-badge items-center gap-1 rounded-full border border-[var(--fav)] px-2 py-[1px] text-[11.5px] font-medium text-[var(--fav)] ${className}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
      {m.favorite.badge}
    </span>
  );
}

/**
 * Begrüßung beim ersten Besuch: fragt einmal nach dem Lieblingsteam. Erscheint nur, solange weder ein
 * Team gewählt noch die Frage übersprungen wurde (lib/favorite.ts favoriteAsked); ändern oder entfernen
 * lässt sich die Auswahl danach jederzeit oben rechts (FavoriteTeamPicker).
 */
export function FavoriteWelcome({ teams }: { teams: PickerTeam[] }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const { m } = useI18n();
  const f = m.favorite;
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (favoriteAsked()) return;
    // Kurz nach dem Laden, damit die Seite zuerst steht und der Dialog nicht beim ersten Zeichnen aufblitzt
    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLButtonElement>("button[data-team]")?.focus({ preventScroll: true });
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      markFavoriteAsked();
      setOpen(false);
    };
    document.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open) return null;
  const chosen = teams.find((t) => t.id === pick);

  const skip = () => {
    markFavoriteAsked();
    setOpen(false);
  };
  const choose = (id: string | null) => {
    if (!id) return;
    writeFavorite(id);
    setOpen(false);
  };

  return (
    <div
      className="fav-welcome fixed inset-0 z-[90] grid place-items-end bg-black/45 backdrop-blur-[2px] sm:place-items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && skip()}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fav-welcome-title"
        aria-describedby="fav-welcome-text"
        className="fav-welcome__card flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl shadow-black/40 sm:max-w-[620px] sm:rounded-2xl"
      >
        <div className="px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-3">{f.welcomeKicker}</p>
          <h2 id="fav-welcome-title" className="display mt-1.5 text-[30px] font-bold leading-none tracking-tight text-ink">
            {f.welcomeTitle}
          </h2>
          <p id="fav-welcome-text" className="mt-2.5 max-w-[58ch] text-[14px] leading-relaxed text-ink-2">
            {f.welcomeText}
          </p>
        </div>

        <ul className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto px-5 pb-4 sm:grid-cols-3 sm:px-6" aria-label={f.teamsList}>
          {teams.map((t) => {
            const on = t.id === pick;
            const c1 = t.colors?.primary ?? "var(--line-strong)";
            const c2 = t.colors?.secondary ?? c1;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  data-team={t.id}
                  aria-pressed={on}
                  onClick={() => setPick(t.id)}
                  onDoubleClick={() => choose(t.id)}
                  className={`relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    on ? "border-transparent bg-surface-2 text-ink" : "border-line text-ink-2 hover:border-line-strong hover:bg-surface-2/60 hover:text-ink"
                  }`}
                  style={on ? { boxShadow: `inset 0 0 0 2px ${c1}, inset 0 0 0 3.5px ${c2}` } : undefined}
                >
                  <TeamLogo team={t} size={30} />
                  <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-tight [overflow-wrap:anywhere]">{t.name}</span>
                  {on && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="shrink-0" aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:px-6">
          <p className="text-[12.5px] text-ink-3">{f.changeLater}</p>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={skip} className="rounded-md px-3 py-2 text-[14px] text-ink-2 hover:bg-surface-2 hover:text-ink">
              {f.skip}
            </button>
            <button
              type="button"
              onClick={() => choose(pick)}
              disabled={!pick}
              className="rounded-md bg-accent px-4 py-2 text-[14px] font-semibold text-accent-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {chosen ? f.choose(chosen.short) : f.chooseTeam}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FAVORITE_EVENT, FAVORITE_KEY, applyFavorite, readFavorite, writeFavorite } from "@/lib/favorite";
import TeamLogo, { type LogoTeam } from "./TeamLogo";

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
    { label: "Aktuelle Saison", list: teams.filter((t) => t.current) },
    { label: "Frühere GFL-Teams", list: teams.filter((t) => !t.current) },
  ];

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={selected ? `Lieblingsteam: ${selected.name}` : "Lieblingsteam wählen"}
        className="flex h-9 items-center gap-2 rounded-md px-2 text-[14px] text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        {selected ? (
          <>
            <TeamLogo team={selected} size={24} />
            <span className="hidden font-medium text-ink lg:inline">{selected.short}</span>
          </>
        ) : (
          <>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" strokeLinejoin="round" />
            </svg>
            <span className="hidden lg:inline">Mein Team</span>
          </>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Lieblingsteam wählen" className="absolute right-0 z-50 mt-1.5 w-[300px] overflow-hidden rounded-xl border border-line bg-surface shadow-xl shadow-black/30">
          <p className="border-b border-line px-4 py-3 text-[13px] text-ink-2">
            Spieler deines Teams werden auf allen Seiten markiert. Die Auswahl bleibt in diesem Browser gespeichert.
          </p>
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
                          {t.id === fav && <span className="text-[12px] text-[var(--fav)]">gewählt</span>}
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
              Auswahl zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Kleines Kennzeichen "Dein Team"; nur sichtbar, wenn ein umgebendes Element zum Lieblingsteam gehoert. */
export function FavBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`fav-badge items-center gap-1 rounded-full border border-[var(--fav)] px-2 py-[1px] text-[11.5px] font-medium text-[var(--fav)] ${className}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
      Dein Team
    </span>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Entry = [kind: "p" | "t", id: string, name: string, extra: string];

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const norm = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase();

/** Globale Suche nach Spielern und Teams. Taste "/" springt ins Suchfeld. */
export default function SearchBox() {
  const router = useRouter();
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  function load() {
    if (index || failed) return;
    fetch(`${BASE}/data/search.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setIndex)
      .catch(() => setFailed(true));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/input|textarea|select/i.test(t.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const term = norm(q.trim());
    if (!index || term.length < 2) return [];
    const words = term.split(/\s+/);
    const hits = index.filter((e) => {
      const n = norm(e[2]);
      return words.every((w) => n.includes(w));
    });
    hits.sort((a, b) => {
      const an = norm(a[2]).startsWith(term) ? 0 : 1;
      const bn = norm(b[2]).startsWith(term) ? 0 : 1;
      return (a[0] === "t" ? -1 : 0) - (b[0] === "t" ? -1 : 0) || an - bn || a[2].localeCompare(b[2], "de");
    });
    return hits.slice(0, 8);
  }, [q, index]);

  function go(e: Entry) {
    setOpen(false);
    setQ("");
    router.push(e[0] === "t" ? `/teams/${e[1]}/` : `/spieler/${e[1]}/`);
  }

  return (
    <div className="relative w-full sm:w-64">
      <label htmlFor="global-search" className="sr-only">
        Spieler oder Team suchen
      </label>
      <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" strokeLinecap="round" />
      </svg>
      <input
        ref={input}
        id="global-search"
        type="search"
        autoComplete="off"
        placeholder="Spieler oder Team"
        value={q}
        onFocus={() => {
          load();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            go(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            input.current?.blur();
          }
        }}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        aria-activedescendant={results[active] ? `sr-${results[active][1]}` : undefined}
        className="h-9 w-full rounded-md border border-line bg-surface pl-8 pr-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
      />
      {open && q.trim().length >= 2 && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 w-full min-w-72 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-xl shadow-black/30"
        >
          {failed && <li className="px-3 py-2 text-sm text-ink-2">Suchindex konnte nicht geladen werden.</li>}
          {!failed && !index && <li className="px-3 py-2 text-sm text-ink-2">Lade Suchindex …</li>}
          {index && results.length === 0 && <li className="px-3 py-2 text-sm text-ink-2">Keine Treffer für „{q.trim()}“.</li>}
          {results.map((e, i) => (
            <li
              key={e[0] + e[1]}
              id={`sr-${e[1]}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(ev) => {
                ev.preventDefault();
                go(e);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-1.5 ${i === active ? "bg-surface-2" : ""}`}
            >
              <span className="truncate text-[14px] text-ink">{e[2]}</span>
              <span className="shrink-0 text-[12px] text-ink-3">{e[3]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

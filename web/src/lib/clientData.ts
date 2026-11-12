"use client";

/**
 * Laedt die Website-Daten im Browser (fuer Suchen, Leaders und Vergleich).
 * Jede Datei wird nur einmal geladen und dann wiederverwendet.
 */
import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const cache = new Map<string, Promise<unknown>>();

export function loadData<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    cache.set(
      file,
      fetch(`${BASE}/data/${file}`).then((r) => {
        if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(file) as Promise<T>;
}

export type Loaded<T> = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: T };

/** Laedt mehrere Dateien parallel; liefert erst "ready", wenn alle da sind. */
export function useData<T extends unknown[]>(files: string[]): Loaded<T> {
  const key = files.join("|");
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    Promise.all(files.map((f) => loadData(f)))
      .then((d) => alive && setState({ status: "ready", data: d as T }))
      .catch((e) => alive && setState({ status: "error", error: String(e) }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** Liest und schreibt Filter in die Adresse (?a=1&b=2), damit Abfragen teilbar sind. */
export function readQuery(): URLSearchParams {
  return typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
}

export function writeQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, v);
  const s = q.toString();
  window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
}

import type { Loaded } from "@/lib/clientData";

/** Lade- und Fehlerzustand fuer Seiten, die Daten im Browser laden. */
export function Loading({ state }: { state: Loaded<unknown> }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink">
        Die Daten konnten nicht geladen werden ({state.error}). Seite neu laden; falls es bleibt, fehlen die Website-Daten (npm run data).
      </p>
    );
  }
  return (
    <p className="py-10 text-[14px] text-ink-3" aria-live="polite">
      Lade Daten …
    </p>
  );
}

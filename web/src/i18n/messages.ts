/**
 * Alle Texte der Oberfläche, getrennt nach Sprache (de/, en/) und Bereich (nav, player, trapview …).
 * Deutsch ist die Referenz: der Typ Messages entsteht aus de/, jede andere Sprache muss dieselbe Form haben –
 * fehlt ein Text oder hat eine Funktion andere Parameter, meldet TypeScript einen Fehler.
 *
 * Texte mit Werten (Mehrzahl, Zahlen, Namen) sind Funktionen, z. B. games: (n) => `${n} Spiele`.
 * Eigennamen (Spieler, Teams, GFL) und Daten aus der Datenbank werden nie übersetzt.
 */
import type { Lang } from "./config";
import * as de from "./de";
import * as en from "./en";

type Leaf = string | ((...args: never[]) => string);

/** Gleiche Form wie T, aber beliebige Texte statt der deutschen Literale. */
export type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof de>;

export const MESSAGES: Record<Lang, Messages> = { de, en };

/** Punkt-Pfad zu einem Text, z. B. "nav.players" – für <T k="…"> in Server-Komponenten. */
export type MessagePath<T = Messages, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends Leaf ? `${P}${K}` : MessagePath<T[K], `${P}${K}.`>;
}[keyof T & string];

export function resolveMessage(m: Messages, path: string, args: unknown[] = []): string {
  let cur: unknown = m;
  for (const part of path.split(".")) cur = (cur as Record<string, unknown> | undefined)?.[part];
  if (typeof cur === "function") return (cur as (...a: unknown[]) => string)(...args);
  return typeof cur === "string" ? cur : path;
}

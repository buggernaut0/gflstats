/** Einmal je Build berechnete Grundlagen fuer mehrere Seiten. */
import { getPlayers, getPlayerSeasons } from "./data";
import { entries, type Entry } from "./profile";

let cache: Entry[] | null = null;
export const allEntries = (): Entry[] => (cache ??= entries(getPlayerSeasons(), getPlayers()));

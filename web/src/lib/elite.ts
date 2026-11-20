/**
 * Elite-Status für die Website (Server-Komponenten, statischer Export). Die Regel selbst steht nur in
 * trapview/spotlight/elite.ts (beste zehn je Positionsgruppe); hier werden lediglich dieselben
 * Saisonwerte wie beim Trap-View-Export zusammengestellt: alle Spiele der Saison je Spieler und Team,
 * Rolle aus der Spielerliste, erfasste Spalten aus meta.json.
 */
import { buildPools, type PoolPlayer } from "@/trapview/spotlight/scoring";
import { ELITE_GROUPS, ELITE_TOP, eliteBoard, type EliteEntry } from "@/trapview/spotlight/elite";
import { getMeta, getPlayerGames, playerMap } from "./data";
import { addStats } from "./stats";

export type { EliteEntry };
export { ELITE_GROUPS, ELITE_TOP };

const cache = new Map<number, Map<string, EliteEntry[]>>();

/** Elite-Spieler einer Saison: Spieler-ID → Platzierungen (leer, wenn die Saison nicht vorliegt). */
export function eliteSeason(season: number): Map<string, EliteEntry[]> {
  const hit = cache.get(season);
  if (hit) return hit;
  const meta = getMeta();
  let board = new Map<string, EliteEntry[]>();
  if (meta.seasons.includes(season)) {
    const players = playerMap();
    const byPT = new Map<string, PoolPlayer & { gameIds: Set<string> }>();
    for (const r of getPlayerGames(season)) {
      const key = `${r.p}|${r.t}`;
      let e = byPT.get(key);
      if (!e) {
        const p = players.get(r.p);
        // Sammeleinträge zweier Spieler nie bewerten (wie in der Trap View)
        const role = p && !p.shared ? p.seasons.find((s) => s.season === season)?.role ?? null : null;
        byPT.set(key, (e = { id: r.p, team: r.t, role, games: 0, stats: {}, gameIds: new Set() }));
      }
      e.gameIds.add(r.g);
      addStats(e.stats, r.s);
    }
    const pool = [...byPT.values()].map(({ gameIds, ...p }) => ({ ...p, games: gameIds.size }));
    const available = Object.entries(meta.availability).filter(([, s]) => s.includes(season)).map(([k]) => k);
    board = eliteBoard(buildPools(pool, available));
  }
  cache.set(season, board);
  return board;
}

/** Saison, deren Elite-Status als „aktuell“ gilt (Profil, Suche): die neueste in den Daten. */
export function currentEliteSeason(): number {
  return getMeta().currentSeason;
}

/** Kompakter Index für Client-Komponenten (Tabellen): "spieler-id:saison" → beste Elite-Platzierung. */
export function eliteIndex(): Record<string, EliteEntry> {
  const out: Record<string, EliteEntry> = {};
  for (const season of getMeta().seasons) {
    for (const [id, list] of eliteSeason(season)) if (list[0]) out[`${id}:${season}`] = list[0];
  }
  return out;
}

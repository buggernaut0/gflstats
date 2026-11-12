/**
 * Datenzugriff beim Erzeugen der Seiten (nur auf dem Build-Rechner, nie im Browser).
 * Liest die Dateien, die scripts/build_data.py nach public/data/ schreibt.
 */
import fs from "node:fs";
import path from "node:path";
import fieldsJson from "@/config/fields.json";
import type { FieldDef, Game, Meta, Player, PlayerGame, PlayerSeason, Team, TeamSeason } from "./types";
import type { TeamRoster } from "./lineup";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const cache = new Map<string, unknown>();

function read<T>(file: string): T {
  if (!cache.has(file)) {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) {
      throw new Error(`Datei fehlt: ${full}. Zuerst "npm run data" ausfuehren (erzeugt die Website-Daten).`);
    }
    cache.set(file, JSON.parse(fs.readFileSync(full, "utf-8")));
  }
  return cache.get(file) as T;
}

export const getMeta = () => read<Meta>("meta.json");
export const getTeams = () => read<Team[]>("teams.json");
/** Offizielle Kader: Saison -> Team -> Kader (curation/rosters.json) */
export const getRosters = () => read<Record<string, Record<string, TeamRoster>>>("rosters.json");
export const getPlayers = () => read<Player[]>("players.json");
export const getGames = () => read<Game[]>("games.json");
export const getPlayerSeasons = () => read<PlayerSeason[]>("player_seasons.json");
export const getTeamSeasons = () => read<TeamSeason[]>("team_seasons.json");
export const getPlayerGames = (season: number) => read<PlayerGame[]>(`pg/${season}.json`);
export const FIELDS: FieldDef[] = (fieldsJson as { fields: FieldDef[] }).fields;

export function fieldDef(key: string): FieldDef {
  const f = FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`Unbekanntes Statistikfeld: ${key}`);
  return f;
}

export function teamMap(): Map<string, Team> {
  return new Map(getTeams().map((t) => [t.id, t]));
}

export function playerMap(): Map<string, Player> {
  return new Map(getPlayers().map((p) => [p.id, p]));
}

/** Teamname so, wie er in der jeweiligen Saison hiess. */
export function teamNameIn(team: Team, season: number): string {
  return team.namesBySeason[String(season)] ?? team.name;
}

/** Ist ein Feld in dieser Saison erfasst? (sonst: "nicht erfasst" statt 0 anzeigen) */
export function isAvailable(field: string, season: number): boolean {
  return getMeta().availability[field]?.includes(season) ?? false;
}

// ---------------------------------------------------------------- Indizes (einmal je Build berechnet)

let pgIndex: Map<string, PlayerGame[]> | null = null;

/** Alle Spielzeilen eines Spielers ueber alle Saisons. */
export function playerGameRows(player: string): PlayerGame[] {
  if (!pgIndex) {
    pgIndex = new Map();
    for (const s of getMeta().seasons) {
      for (const r of getPlayerGames(s)) {
        const list = pgIndex.get(r.p);
        if (list) list.push(r);
        else pgIndex.set(r.p, [r]);
      }
    }
  }
  return pgIndex.get(player) ?? [];
}

let gameIdx: Map<string, Game> | null = null;
export function gameMap(): Map<string, Game> {
  if (!gameIdx) gameIdx = new Map(getGames().map((g) => [g.id, g]));
  return gameIdx;
}

const rankCache = new Map<string, Map<string, { rank: number; of: number }>>();

/**
 * Liga-Rang eines Spielers in einer Saison fuer ein Originalfeld (Saisonsumme, Regular + Playoffs).
 * Gewertet werden alle Spieler mit einem Wert > 0; gleiche Werte teilen sich den Rang.
 */
export function leagueRank(field: string, season: number, player: string): { rank: number; of: number } | null {
  const key = `${field}|${season}`;
  if (!rankCache.has(key)) {
    const shared = new Set(getPlayers().filter((p) => p.shared).map((p) => p.id));
    const rows = getPlayerSeasons()
      .filter((s) => s.season === season && s.scope === "all" && (s.stats[field] ?? 0) > 0 && !shared.has(s.player))
      .sort((a, b) => b.stats[field] - a.stats[field]);
    const m = new Map<string, { rank: number; of: number }>();
    rows.forEach((r, i) => {
      const rank = i > 0 && r.stats[field] === rows[i - 1].stats[field] ? m.get(rows[i - 1].player)!.rank : i + 1;
      m.set(r.player, { rank, of: rows.length });
    });
    rankCache.set(key, m);
  }
  return rankCache.get(key)!.get(player) ?? null;
}

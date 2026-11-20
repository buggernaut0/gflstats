/**
 * Elite – die besten zehn Spieler je Positionsgruppe und Saison.
 *
 * Einzige Stelle, an der Elite-Status vergeben wird; Trap View (Datenexport) und Website rufen nur
 * eliteBoard auf. Keine Handvergabe: Alles folgt aus den Saisonwerten der Statistikbögen.
 * Läuft auch beim Datenexport (Node mit Type-Stripping) – deshalb nur ein relativer Import mit Endung.
 *
 * Verfahren:
 *   - Grundlage sind die Vergleichsgruppen und Profilwerte des Player Spotlight (scoring.ts): pro Spiel
 *     bzw. pro Versuch, kleine Stichproben zum Ligaschnitt geglättet, Perzentile nur innerhalb der Gruppe.
 *     Summen über viele Spiele bevorzugen also niemanden, Mindestspiele und Mindestvolumen gelten.
 *   - Gerankt wird jede Positionsgruppe für sich – nie über Gruppen hinweg. Ein Receiver konkurriert nie
 *     mit einem Quarterback oder Verteidiger.
 *   - Top ELITE_TOP je Gruppe. Gleichstand: mehr Spiele vor weniger, danach die Spieler-ID (stabil, nachvollziehbar).
 *
 * Grenzen der Daten (bewusst kein Elite-Status statt geratener):
 *   - Die Statistikbögen kennen nur die Rollen QB, RB, WR/TE und DEF. WR und TE sind nicht getrennt,
 *     ebenso wenig DL, LB und DB. Die Defense wird daher in drei Spielprofilen gerankt, die den
 *     Positionen am nächsten kommen: Pass Rush (≈ D-Line), Tackling (≈ Linebacker), Coverage (≈ Secondary).
 *   - Offensive Linemen haben keine Leistungswerte in den Bögen – für sie gibt es keinen Elite-Status.
 *   - Kicker und Punter werden mangels belastbarer Vergleichswerte nicht gerankt.
 */
import { PROFILES, scorePlayer, type ProfileId, type SeasonPools } from './scoring.ts';

export const ELITE_TOP = 10;

/** Positionsgruppen mit eigener Rangliste (Reihenfolge = Anzeigereihenfolge). */
export const ELITE_GROUPS: { profile: ProfileId; label: string; title: string; short: string }[] = [
  { profile: 'qb', label: 'Quarterbacks', title: 'Quarterbacks', short: 'QB' },
  { profile: 'rb', label: 'Running Backs', title: 'Running Backs', short: 'RB' },
  { profile: 'rec', label: 'Receiver (WR/TE)', title: 'Receiver', short: 'WR/TE' },
  { profile: 'rusher', label: 'Pass Rusher (Defense)', title: 'Pass Rusher', short: 'Pass Rush' },
  { profile: 'tackler', label: 'Tackler (Defense)', title: 'Tackler', short: 'Tackling' },
  { profile: 'coverage', label: 'Coverage-Verteidiger (Defense)', title: 'Coverage', short: 'Coverage' },
];

export interface EliteEntry {
  profile: ProfileId;
  /** Positionsgruppe im Plural, z. B. „Quarterbacks“ */
  group: string;
  /** Kurzer Titel für die Plakette, z. B. „Receiver“ */
  title: string;
  /** Kurzform für kleine Abzeichen, z. B. „QB“ */
  short: string;
  /** Platz in der Gruppe (1–ELITE_TOP) */
  rank: number;
  /** Größe der Vergleichsgruppe */
  of: number;
  /** Profilwert 0–100 */
  score: number;
  team: string;
}

/**
 * Elite-Spieler einer Saison: Spieler-ID → Platzierungen (meist eine; ein Verteidiger kann in zwei
 * Defense-Profilen unter den besten zehn sein). Sortiert nach Platz, dann nach Gruppenreihenfolge.
 */
export function eliteBoard(pools: SeasonPools, top = ELITE_TOP): Map<string, EliteEntry[]> {
  const out = new Map<string, EliteEntry[]>();
  for (const g of ELITE_GROUPS) {
    const pool = pools.profiles[g.profile];
    if (!pool) continue;
    const ranked = pool.members
      .map((p) => ({ p, s: scorePlayer(pools, p, g.profile) }))
      .filter((x): x is { p: typeof x.p; s: NonNullable<typeof x.s> } => x.s !== null)
      .sort((a, b) => b.s.score - a.s.score || b.p.games - a.p.games || a.p.id.localeCompare(b.p.id));
    // Spieler mit zwei Teams in einer Saison nur einmal (mit dem besseren Eintrag)
    const seen = new Set<string>();
    let rank = 0;
    for (const { p, s } of ranked) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      rank += 1;
      if (rank > top) break;
      const list = out.get(p.id) ?? [];
      list.push({ profile: g.profile, group: g.label, title: g.title, short: g.short, rank, of: pool.members.length, score: s.score, team: p.team });
      out.set(p.id, list);
    }
  }
  const order = (e: EliteEntry) => ELITE_GROUPS.findIndex((g) => g.profile === e.profile);
  for (const list of out.values()) list.sort((a, b) => a.rank - b.rank || order(a) - order(b));
  return out;
}

/** Beste Platzierung eines Spielers (für ein einzelnes Abzeichen). */
export function bestElite(list: EliteEntry[] | undefined): EliteEntry | null {
  return list?.[0] ?? null;
}

/** Elite-Platzierung in einem bestimmten Profil (z. B. dem, mit dem ein Spieler vorgestellt wird). */
export function eliteIn(list: EliteEntry[] | undefined, profile: ProfileId): EliteEntry | null {
  return list?.find((e) => e.profile === profile) ?? null;
}

/** Kurzbeschreibung fürs Methodik-Kapitel. */
export const ELITE_METHOD = {
  top: ELITE_TOP,
  groups: ELITE_GROUPS.map((g) => ({ ...g, peers: PROFILES[g.profile].peers, min: PROFILES[g.profile].minLabel })),
};

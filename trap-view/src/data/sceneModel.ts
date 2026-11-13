import type { DataGroup, FormationSlot, LineupEntry, Player, SeasonData, Side, Team } from './types';
import { resolveKit, type Kit } from './kits';
import { DUELS, FORMATION } from './formation';
import { GROUP_LABEL, initialName, lastName } from './names';
import { facingToRotationY, losWorldX, toWorld } from '../field/fieldCoords';

/** Positionsgruppen, auf die sich Kamera und Labels beziehen können. */
export type Group = 'OL' | 'BACKFIELD' | 'REC' | 'DL' | 'LB' | 'DB';

const GROUP_OF: Record<string, Group> = {
  LT: 'OL', LG: 'OL', C: 'OL', RG: 'OL', RT: 'OL',
  QB: 'BACKFIELD', RB: 'BACKFIELD',
  WR: 'REC', TE: 'REC',
  DE: 'DL', DT: 'DL',
  LB: 'LB',
  CB: 'DB', S: 'DB',
};

/** Ein Platz der Formation, fertig aufgelöst für die Szene. */
export interface ScenePlayer {
  /** Eindeutig je Partie: Seite + Formationsplatz */
  id: string;
  role: string;
  side: Side;
  group: Group;
  /** null = Platz laut Daten unbesetzt (wird als Silhouette ohne Namen gezeigt) */
  player: Player | null;
  /** Positionsgruppe laut Daten (z. B. "WR", "WR/TE", "DEF") */
  dataGroup: DataGroup;
  posLabel: string;
  /** Nachname für Labels/Trikot, null bei unbesetztem Platz */
  shortName: string | null;
  slot: FormationSlot;
  team: Team;
  kit: Kit;
  /** Weltposition der Füße. */
  world: [number, number, number];
  rotationY: number;
}

export interface SceneMatchup {
  id: string;
  offense: ScenePlayer;
  defense: ScenePlayer;
}

/** Alles, was Szene, Kamera und UI über die aktuelle Partie wissen müssen. */
export interface SceneModel {
  season: SeasonData;
  offense: Team;
  defense: Team;
  offenseKit: Kit;
  defenseKit: Kit;
  losX: number;
  players: ScenePlayer[];
  byRole: Map<string, ScenePlayer>;
  matchups: SceneMatchup[];
}

const v = (p: Player | null, k: string) => p?.stats[k] ?? 0;
/** Passverteidigung: Interceptions + abgewehrte Pässe (beides echte Spalten der Statistikbögen). */
const coverage = (e: LineupEntry) => v(e.player, 'intercepted') + v(e.player, 'brokenuppass');

/**
 * Ordnet die Starting Lineup den Plätzen der dargestellten Formation zu.
 *
 * Grundlage ist der Platz, den die Website-Methodik jedem Spieler gibt (spot = [Gruppe, Index]).
 * Feinere Positionen (LT/RG, DE/DT, CB/S) liefern die Daten nicht – die Formation ist reine
 * Darstellung, die Labels zeigen deshalb immer nur die Gruppe aus den Daten (z. B. "OL", "DB", "DEF").
 *
 * Einzige Umsortierung: Innerhalb der vier Plätze der Secondary stehen die Spieler mit den meisten
 * Interceptions + abgewehrten Pässen außen (CB1, CB2, dann S1, S2). So zeigen die Receiver-Duelle die
 * produktivsten Passverteidiger. Die Receiver sind bereits nach Receiving Yards sortiert (WR1 = Bester).
 */
function assign(entries: LineupEntry[], side: Side): Map<string, LineupEntry> {
  const out = new Map<string, LineupEntry>();
  const at = (group: string, i: number) => entries.find((e) => e.spot[0] === group && e.spot[1] === i);
  const put = (role: string, e: LineupEntry | undefined) => { if (e) out.set(role, e); };

  if (side === 'offense') {
    put('QB', at('QB', 0));
    put('RB', at('RB', 0));
    put('RB2', at('RB', 1));
    put('WR1', at('WR', 0));
    put('WR2', at('WR', 1));
    put('WR3', at('WR', 2));
    put('TE', at('TE', 0));
    ['LT', 'LG', 'C', 'RG', 'RT'].forEach((r, i) => put(r, at('OL', i)));
  } else {
    ['DE1', 'DT1', 'DT2', 'DE2'].forEach((r, i) => put(r, at('DL', i)));
    // Website-Formation: LB 0 Mitte, 1 links, 2 rechts
    put('LB2', at('LB', 0));
    put('LB1', at('LB', 1));
    put('LB3', at('LB', 2));
    const secondary = [0, 1, 2, 3].map((i) => at('DB', i)).filter((e): e is LineupEntry => !!e);
    const filled = secondary.filter((e) => e.player).sort((a, b) => coverage(b) - coverage(a));
    const sorted = [...filled, ...secondary.filter((e) => !e.player)];
    ['CB1', 'CB2', 'S1', 'S2'].forEach((r, i) => put(r, sorted[i]));
  }
  return out;
}

/** Kurzname je Spieler-ID; bei gleichem Nachnamen im selben Team mit Initiale, damit nichts verwechselt wird. */
function shortNames(team: Team): Map<string, string> {
  const all = [...team.lineup.offense, ...team.lineup.defense].flatMap((e) => (e.player ? [e.player] : []));
  const count = new Map<string, number>();
  const names = new Set([...(team.squad ?? []), ...all.map((p) => p.name)]);
  for (const n of names) count.set(lastName(n).toLowerCase(), (count.get(lastName(n).toLowerCase()) ?? 0) + 1);
  return new Map(all.map((p) => [p.id, (count.get(lastName(p.name).toLowerCase()) ?? 0) > 1 ? initialName(p.name) : lastName(p.name)]));
}

function fill(team: Team, side: Side, kit: Kit, ballOn: number): ScenePlayer[] {
  const slots = side === 'offense' ? FORMATION.offense : FORMATION.defense;
  const byRole = assign(side === 'offense' ? team.lineup.offense : team.lineup.defense, side);
  const names = shortNames(team);
  const out: ScenePlayer[] = [];
  for (const slot of slots) {
    const entry = byRole.get(slot.role);
    // Optionale Plätze (RB2) nur zeigen, wenn die Lineup sie wirklich belegt
    if (!entry && slot.role === 'RB2') continue;
    // WR3 entfällt, wenn der elfte Platz an einen zweiten Running Back ging
    if (!entry && slot.role === 'WR3' && byRole.get('RB2')) continue;
    const player = entry?.player ?? null;
    const dataGroup: DataGroup = entry?.group ?? (slot.position === 'LT' || slot.position === 'LG' || slot.position === 'C' || slot.position === 'RG' || slot.position === 'RT' ? 'OL' : side === 'offense' ? 'REC' : 'DEF');
    out.push({
      id: `${side}-${slot.role}`,
      role: slot.role,
      side,
      group: GROUP_OF[slot.position],
      player,
      dataGroup,
      posLabel: GROUP_LABEL[dataGroup],
      shortName: player ? names.get(player.id) ?? lastName(player.name) : null,
      slot,
      team,
      kit,
      world: toWorld(ballOn, slot.x, slot.y),
      rotationY: facingToRotationY(slot.facing),
    });
  }
  return out;
}

export function buildSceneModel(season: SeasonData, offenseId: string, defenseId: string): SceneModel {
  const offense = season.teams.find((t) => t.id === offenseId) ?? season.teams[0];
  const defense = season.teams.find((t) => t.id === defenseId && t.id !== offense.id) ?? season.teams.find((t) => t.id !== offense.id) ?? season.teams[0];
  const offenseKit = resolveKit(offense.colors, 'dark');
  const defenseKit = resolveKit(defense.colors, 'light');
  const { ballOn } = FORMATION;

  const players = [
    ...fill(offense, 'offense', offenseKit, ballOn),
    ...fill(defense, 'defense', defenseKit, ballOn),
  ];
  const byRole = new Map(players.map((p) => [p.role, p]));

  const matchups: SceneMatchup[] = [];
  for (const d of DUELS) {
    const o = byRole.get(d.offenseRole);
    const x = byRole.get(d.defenseRole);
    if (o?.player && x?.player) matchups.push({ id: d.id, offense: o, defense: x });
  }

  return {
    season,
    offense, defense, offenseKit, defenseKit,
    losX: losWorldX(ballOn),
    players, byRole, matchups,
  };
}

/** Kurzbezeichnung eines Spielers für Bauchbinden und Buttons: "WR #1 Harris" bzw. "DEF Crosswell". */
export function playerTag(p: ScenePlayer, withName = true): string {
  const num = p.player?.number != null ? ` #${p.player.number}` : '';
  const name = withName && p.shortName ? ` ${p.shortName}` : '';
  return `${p.posLabel}${num}${name}`;
}

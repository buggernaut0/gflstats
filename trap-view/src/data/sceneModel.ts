import type { ComparisonStat, FormationSlot, Player, Side, Team, TrapViewData } from './types';
import { resolveKit, type Kit } from './kits';
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

/** Ein Spieler, fertig aufgelöst für die Szene. */
export interface ScenePlayer {
  id: string;
  role: string;
  side: Side;
  group: Group;
  player: Player;
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
  stats: ComparisonStat[];
}

/** Alles, was Szene, Kamera und UI über die aktuelle Partie wissen müssen. */
export interface SceneModel {
  isSampleData: boolean;
  offense: Team;
  defense: Team;
  offenseKit: Kit;
  defenseKit: Kit;
  losX: number;
  players: ScenePlayer[];
  byRole: Map<string, ScenePlayer>;
  matchups: SceneMatchup[];
}

function fill(team: Team, side: Side, slots: FormationSlot[], kit: Kit, ballOn: number): ScenePlayer[] {
  const roster = side === 'offense' ? team.offense : team.defense;
  const out: ScenePlayer[] = [];
  for (const slot of slots) {
    const player = roster.filter((p) => p.position === slot.position)[slot.index];
    if (!player) continue;
    out.push({
      id: player.id,
      role: slot.role,
      side,
      group: GROUP_OF[slot.position],
      player,
      slot,
      team,
      kit,
      world: toWorld(ballOn, slot.x, slot.y),
      rotationY: facingToRotationY(slot.facing),
    });
  }
  return out;
}

export function buildSceneModel(data: TrapViewData, offenseId: string, defenseId: string): SceneModel {
  const offense = data.teams.find((t) => t.id === offenseId) ?? data.teams[0];
  const defense = data.teams.find((t) => t.id === defenseId) ?? data.teams[1];
  const offenseKit = resolveKit(offense.colors, 'dark');
  const defenseKit = resolveKit(defense.colors, 'light');
  const { ballOn } = data.formation;

  const players = [
    ...fill(offense, 'offense', data.formation.offense, offenseKit, ballOn),
    ...fill(defense, 'defense', data.formation.defense, defenseKit, ballOn),
  ];
  const byRole = new Map(players.map((p) => [p.role, p]));

  const matchups: SceneMatchup[] = [];
  for (const m of data.matchups) {
    const o = byRole.get(m.offenseRole);
    const d = byRole.get(m.defenseRole);
    if (o && d) matchups.push({ id: m.id, offense: o, defense: d, stats: m.stats });
  }

  return {
    isSampleData: data.isSampleData,
    offense, defense, offenseKit, defenseKit,
    losX: losWorldX(ballOn),
    players, byRole, matchups,
  };
}

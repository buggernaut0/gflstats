/**
 * Aufstellung für die 2D-Wiedergabe: dieselben elf Plätze wie in der 3D-Trap-View
 * (Shotgun 11 gegen 4-3, data/formation.ts) und dieselbe Platzvergabe aus der Starting Lineup
 * (data/sceneModel.ts). Unbesetzte Plätze bleiben unbesetzt – es wird niemand erfunden.
 */
import { buildSceneModel } from '../data/sceneModel';
import type { SeasonData } from '../data/types';

export interface Slot {
  /** Formationsplatz, z. B. "WR1", "CB2", "LT" */
  role: string;
  /** Position für die Anzeige im Punkt (QB, WR, DB …) */
  pos: string;
  /** Formation: quer (Yards, negativ = links aus Sicht der Offense), längs (Yards ab LOS) */
  x: number;
  y: number;
  id: string | null;
  name: string | null;
  number: number | null;
}

export interface TeamUnits { offense: Slot[]; defense: Slot[] }

const POS: Record<string, string> = {
  LT: 'OL', LG: 'OL', C: 'OL', RG: 'OL', RT: 'OL', TE: 'TE', QB: 'QB', RB: 'RB', RB2: 'RB',
  WR1: 'WR', WR2: 'WR', WR3: 'WR', DE1: 'DL', DT1: 'DL', DT2: 'DL', DE2: 'DL',
  LB1: 'LB', LB2: 'LB', LB3: 'LB', CB1: 'DB', CB2: 'DB', S1: 'DB', S2: 'DB',
};

export function buildUnits(season: SeasonData, a: string, b: string): Record<string, TeamUnits> {
  const slots = (offense: string, defense: string, side: 'offense' | 'defense') =>
    buildSceneModel(season, offense, defense).players
      .filter((p) => p.side === side)
      .map((p): Slot => ({
        role: p.role,
        pos: POS[p.role] ?? p.role,
        x: p.slot.x,
        y: p.slot.y,
        id: p.player?.id ?? null,
        name: p.shortName,
        number: p.player?.number ?? null,
      }));
  return {
    [a]: { offense: slots(a, b, 'offense'), defense: slots(b, a, 'defense') },
    [b]: { offense: slots(b, a, 'offense'), defense: slots(a, b, 'defense') },
  };
}

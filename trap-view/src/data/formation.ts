import type { Formation } from './types';

/**
 * Dargestellte Grundformation: Offense Shotgun mit drei Receivern, Defense 4-3.
 * Reine Darstellung – die Daten enthalten keine Spielzüge oder Feldpositionen. Welche Spieler auf
 * welchen Platz kommen, entscheidet sceneModel.ts aus der Starting Lineup.
 * Koordinaten in Yards relativ zum Ball (x quer, y längs).
 */
export const FORMATION: Formation = {
  id: 'shotgun-11-vs-43',
  name: 'Shotgun 11 vs. 4-3',
  ballOn: 40,
  offense: [
    { role: 'C', position: 'C', x: 0, y: -1.05, facing: 0, stance: 'lineSet', build: 'line' },
    { role: 'LG', position: 'LG', x: -1.45, y: -1.2, facing: 0, stance: 'lineSet', build: 'line' },
    { role: 'RG', position: 'RG', x: 1.45, y: -1.2, facing: 0, stance: 'lineSet', build: 'line' },
    { role: 'LT', position: 'LT', x: -2.95, y: -1.45, facing: 4, stance: 'lineSet', build: 'line' },
    { role: 'RT', position: 'RT', x: 2.95, y: -1.45, facing: -4, stance: 'lineSet', build: 'line' },
    { role: 'TE', position: 'TE', x: 4.45, y: -1.35, facing: 0, stance: 'threePoint', build: 'big' },
    { role: 'QB', position: 'QB', x: 0, y: -5.4, facing: 0, stance: 'shotgun', build: 'big' },
    { role: 'RB', position: 'RB', x: 1.9, y: -5.7, facing: 0, stance: 'ready', build: 'big' },
    { role: 'WR1', position: 'WR', x: -20, y: -0.9, facing: 0, stance: 'receiver', build: 'skill' },
    { role: 'WR2', position: 'WR', x: 20.5, y: -1.6, facing: 0, stance: 'receiver', build: 'skill' },
    { role: 'WR3', position: 'WR', x: -10.5, y: -1.7, facing: 0, stance: 'receiver', build: 'skill' },
    // Nur belegt, wenn der elfte Offense-Platz laut Lineup an einen zweiten Running Back geht (statt WR3)
    { role: 'RB2', position: 'RB', x: -1.9, y: -5.7, facing: 0, stance: 'ready', build: 'big' },
  ],
  defense: [
    { role: 'DE1', position: 'DE', x: -3.9, y: 1.25, facing: 172, stance: 'threePoint', build: 'line' },
    { role: 'DT1', position: 'DT', x: -0.75, y: 1.2, facing: 180, stance: 'threePoint', build: 'line' },
    { role: 'DT2', position: 'DT', x: 2.2, y: 1.2, facing: 180, stance: 'threePoint', build: 'line' },
    { role: 'DE2', position: 'DE', x: 5.6, y: 1.25, facing: 188, stance: 'threePoint', build: 'line' },
    { role: 'LB1', position: 'LB', x: -4.2, y: 4.6, facing: 176, stance: 'ready', build: 'big' },
    { role: 'LB2', position: 'LB', x: 0.6, y: 5.0, facing: 180, stance: 'ready', build: 'big' },
    { role: 'LB3', position: 'LB', x: 5.0, y: 4.5, facing: 184, stance: 'ready', build: 'big' },
    { role: 'CB1', position: 'CB', x: -19.4, y: 4.2, facing: 174, stance: 'ready', build: 'skill' },
    { role: 'CB2', position: 'CB', x: 19.9, y: 4.8, facing: 186, stance: 'ready', build: 'skill' },
    { role: 'S1', position: 'S', x: -10.0, y: 5.6, facing: 176, stance: 'ready', build: 'skill' },
    { role: 'S2', position: 'S', x: 3.5, y: 12.5, facing: 180, stance: 'upright', build: 'skill' },
  ],
};

/**
 * Duelle der Präsentation: jeweils ein Receiver-Platz gegen den gegenüberstehenden Passverteidiger.
 * Ein Duell entfällt, wenn einer der beiden Plätze unbesetzt ist.
 */
export const DUELS: { id: string; offenseRole: string; defenseRole: string }[] = [
  { id: 'wr1-cb1', offenseRole: 'WR1', defenseRole: 'CB1' },
  { id: 'wr2-cb2', offenseRole: 'WR2', defenseRole: 'CB2' },
  { id: 'wr3-s1', offenseRole: 'WR3', defenseRole: 'S1' },
];

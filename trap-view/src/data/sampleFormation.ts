import type { Formation, Matchup } from './types';

/**
 * BEISPIELDATEN – illustrative Aufstellung.
 * Offense: 11 Personnel, Shotgun, Trips-ähnlich nach links. Defense: 4-3 Over.
 * Koordinaten in Yards relativ zum Ball (x quer, y längs).
 */
export const sampleFormation: Formation = {
  id: 'sample-shotgun-11-vs-43',
  name: 'Shotgun 11 vs. 4-3',
  ballOn: 40,
  offense: [
    { role: 'C', position: 'C', index: 0, x: 0, y: -1.05, facing: 0, stance: 'lineSet' },
    { role: 'LG', position: 'LG', index: 0, x: -1.45, y: -1.2, facing: 0, stance: 'lineSet' },
    { role: 'RG', position: 'RG', index: 0, x: 1.45, y: -1.2, facing: 0, stance: 'lineSet' },
    { role: 'LT', position: 'LT', index: 0, x: -2.95, y: -1.45, facing: 4, stance: 'lineSet' },
    { role: 'RT', position: 'RT', index: 0, x: 2.95, y: -1.45, facing: -4, stance: 'lineSet' },
    { role: 'TE', position: 'TE', index: 0, x: 4.45, y: -1.35, facing: 0, stance: 'threePoint' },
    { role: 'QB', position: 'QB', index: 0, x: 0, y: -5.4, facing: 0, stance: 'shotgun' },
    { role: 'RB', position: 'RB', index: 0, x: 1.9, y: -5.7, facing: 0, stance: 'ready' },
    { role: 'WR1', position: 'WR', index: 0, x: -20, y: -0.9, facing: 0, stance: 'receiver' },
    { role: 'WR2', position: 'WR', index: 1, x: 20.5, y: -1.6, facing: 0, stance: 'receiver' },
    { role: 'WR3', position: 'WR', index: 2, x: -10.5, y: -1.7, facing: 0, stance: 'receiver' },
  ],
  defense: [
    { role: 'DE1', position: 'DE', index: 0, x: -3.9, y: 1.25, facing: 172, stance: 'threePoint' },
    { role: 'DT1', position: 'DT', index: 0, x: -0.75, y: 1.2, facing: 180, stance: 'threePoint' },
    { role: 'DT2', position: 'DT', index: 1, x: 2.2, y: 1.2, facing: 180, stance: 'threePoint' },
    { role: 'DE2', position: 'DE', index: 1, x: 5.6, y: 1.25, facing: 188, stance: 'threePoint' },
    { role: 'LB1', position: 'LB', index: 0, x: -4.2, y: 4.6, facing: 176, stance: 'ready' },
    { role: 'LB2', position: 'LB', index: 1, x: 0.6, y: 5.0, facing: 180, stance: 'ready' },
    { role: 'LB3', position: 'LB', index: 2, x: 5.0, y: 4.5, facing: 184, stance: 'ready' },
    { role: 'CB1', position: 'CB', index: 0, x: -19.4, y: 4.2, facing: 174, stance: 'ready' },
    { role: 'CB2', position: 'CB', index: 1, x: 19.9, y: 4.8, facing: 186, stance: 'ready' },
    { role: 'S1', position: 'S', index: 0, x: -10.0, y: 5.6, facing: 176, stance: 'ready' },
    { role: 'S2', position: 'S', index: 1, x: 3.5, y: 12.5, facing: 180, stance: 'upright' },
  ],
};

/** BEISPIELDATEN – rein illustrative Vergleichswerte, keine echten Statistiken. */
export const sampleMatchups: Matchup[] = [
  {
    id: 'wr1-cb1',
    offenseRole: 'WR1',
    defenseRole: 'CB1',
    stats: [
      { label: '40-Yard Dash', offense: 4.48, defense: 4.52, unit: 's', lowerIsBetter: true },
      { label: 'Height', offense: 191, defense: 183, unit: 'cm' },
      { label: 'Targets / Game', offense: 7.4, defense: 5.1 },
      { label: 'Catch Rate vs. Allowed', offense: 64, defense: 52, unit: '%' },
    ],
  },
  {
    id: 'wr2-cb2',
    offenseRole: 'WR2',
    defenseRole: 'CB2',
    stats: [
      { label: '40-Yard Dash', offense: 4.41, defense: 4.44, unit: 's', lowerIsBetter: true },
      { label: 'Height', offense: 180, defense: 185, unit: 'cm' },
      { label: 'Targets / Game', offense: 6.1, defense: 6.3 },
      { label: 'Catch Rate vs. Allowed', offense: 59, defense: 57, unit: '%' },
    ],
  },
  {
    id: 'wr3-s1',
    offenseRole: 'WR3',
    defenseRole: 'S1',
    stats: [
      { label: '40-Yard Dash', offense: 4.39, defense: 4.58, unit: 's', lowerIsBetter: true },
      { label: 'Height', offense: 176, defense: 188, unit: 'cm' },
      { label: 'Targets / Game', offense: 5.2, defense: 3.8 },
      { label: 'Catch Rate vs. Allowed', offense: 71, defense: 61, unit: '%' },
    ],
  },
];

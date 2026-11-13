import type { Build, Player, Position, Team, TeamColors } from './types';

/**
 * BEISPIELDATEN – frei erfunden.
 * Keine echten GFL-Teams, -Spieler oder -Nummern. Wird später durch echte Daten ersetzt.
 */

type Template = [Position, number, Build];

const OFFENSE: Template[] = [
  ['QB', 12, 'big'], ['RB', 22, 'big'],
  ['WR', 87, 'skill'], ['WR', 11, 'skill'], ['WR', 5, 'skill'],
  ['TE', 84, 'big'],
  ['LT', 72, 'line'], ['LG', 65, 'line'], ['C', 55, 'line'], ['RG', 68, 'line'], ['RT', 74, 'line'],
];

const DEFENSE: Template[] = [
  ['DE', 91, 'line'], ['DT', 99, 'line'], ['DT', 95, 'line'], ['DE', 93, 'line'],
  ['LB', 44, 'big'], ['LB', 52, 'big'], ['LB', 50, 'big'],
  ['CB', 24, 'skill'], ['CB', 21, 'skill'],
  ['S', 3, 'skill'], ['S', 7, 'skill'],
];

const FIRST = ['Jonas', 'Malik', 'Luca', 'Finn', 'Deon', 'Erik', 'Noah', 'Tariq', 'Paul', 'Milan', 'Kofi',
  'Ben', 'Jamal', 'Leon', 'Nico', 'Elias', 'Marco', 'Tyrese', 'Jan', 'Samir', 'Oskar', 'Andre'];
const LAST = ['Brandt', 'Okafor', 'Reuter', 'Lindqvist', 'Carter', 'Hoffmann', 'Adeyemi', 'Weiss', 'Kowalski',
  'Baumann', 'Mensah', 'Sturm', 'Jacobs', 'Falk', 'Petrovic', 'Engel', 'Diallo', 'Vogt', 'Navarro', 'Krause',
  'Bishop', 'Thalberg'];

function roster(teamId: string, side: 'o' | 'd', template: Template[], seed: number): Player[] {
  return template.map(([position, number, build], i) => {
    const k = seed * 7 + i * 3 + (side === 'd' ? 11 : 0);
    return {
      id: `${teamId}-${side}-${number}`,
      name: `${FIRST[k % FIRST.length]} ${LAST[(k * 5 + seed) % LAST.length]}`,
      position,
      number,
      build,
    };
  });
}

function team(
  id: string, city: string, nickname: string, abbreviation: string, colors: TeamColors, seed: number,
): Team {
  return {
    id, city, nickname, abbreviation, colors,
    name: `${city} ${nickname}`,
    offense: roster(id, 'o', OFFENSE, seed),
    defense: roster(id, 'd', DEFENSE, seed),
  };
}

export const sampleTeams: Team[] = [
  team('nordhafen', 'Nordhafen', 'Titans', 'NHT', { primary: '#12224a', secondary: '#f26a1b', accent: '#f26a1b' }, 1),
  team('eisenberg', 'Eisenberg', 'Wolves', 'EBW', { primary: '#0d0e10', secondary: '#f2f2f0', accent: '#c9ccd1' }, 2),
  team('rheinfeld', 'Rheinfeld', 'Monarchs', 'RFM', { primary: '#5a1022', secondary: '#d9b25a', accent: '#d9b25a' }, 3),
  team('alpenrod', 'Alpenrod', 'Rangers', 'APR', { primary: '#12382a', secondary: '#c3c8cc', accent: '#7fb89a' }, 4),
];

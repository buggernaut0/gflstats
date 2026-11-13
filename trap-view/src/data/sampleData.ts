import type { TrapViewData } from './types';
import { sampleTeams } from './sampleTeams';
import { sampleFormation, sampleMatchups } from './sampleFormation';

/** BEISPIELDATEN – vollständiges Eingabepaket für den Prototyp. */
export const sampleData: TrapViewData = {
  isSampleData: true,
  teams: sampleTeams,
  formation: sampleFormation,
  matchups: sampleMatchups,
};

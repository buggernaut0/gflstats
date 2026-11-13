/**
 * Simulator – öffentliche Schnittstelle (nur Saison 2026).
 *
 *   const profiles = buildProfiles(simData);           // einmal pro Datensatz
 *   const game = simulateGame(profiles, { seed, home, away });
 *   game.events → Spielzug-Ereignisse für die Darstellung
 */
export { buildProfiles, leagueModel, teamProfile } from './model.ts';
export { simulateGame, type Profiles, type SimOptions } from './engine.ts';
export { createRng, randomSeed } from './rng.ts';
export { MultiSim, type MultiResult, type PlayerAvg } from './multi.ts';
export { PARAMS } from './params.ts';
export type * from './types.ts';

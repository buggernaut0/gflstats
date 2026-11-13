import type { DataGroup } from './types';

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

const PARTICLE = /^(de|da|di|del|della|der|den|van|von|du|la|le|ten|ter|st\.?|al|el|dos|das)$/i;

/**
 * Nachname für Rückenaufdruck und kurze Labels. Namenszusätze wie "Jr." oder "III" werden übersprungen,
 * Namensteile wie "De", "van der" bleiben beim Nachnamen ("Ruben De Ruyter" → "De Ruyter").
 */
export function lastName(full: string): string {
  const parts = full.trim().split(/\s+/);
  while (parts.length > 1 && SUFFIX.test(parts[parts.length - 1])) parts.pop();
  let i = parts.length - 1;
  while (i > 1 && PARTICLE.test(parts[i - 1])) i--;
  return parts.slice(i).join(' ') || full;
}

/** Initiale + Nachname ("W. Enneking") – für Teams mit mehreren Spielern gleichen Nachnamens. */
export function initialName(full: string): string {
  const last = lastName(full);
  const first = full.trim().split(/\s+/)[0];
  return first && first !== last ? `${first[0]}. ${last}` : last;
}

/** Anzeige der Positionsgruppe – genau so fein, wie die Daten es hergeben. */
export const GROUP_LABEL: Record<DataGroup, string> = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', OL: 'OL', DL: 'DL', LB: 'LB', DB: 'DB',
  REC: 'WR/TE', DEF: 'DEF', K: 'K', P: 'P',
};

export const GROUP_NAME: Record<DataGroup, string> = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', OL: 'Offensive Line',
  DL: 'Defensive Line', LB: 'Linebacker', DB: 'Defensive Back', REC: 'Receiver (WR/TE)', DEF: 'Verteidiger',
  K: 'Kicker', P: 'Punter',
};

import type { DataIndex, SeasonData, Team, TeamColors } from './types';

/**
 * Neutrale Platzhalter, solange für ein Team keine belegten Farben in curation/teams.json stehen.
 * Bewusst unbunt, damit sie nicht als echte Vereinsfarben missverstanden werden.
 */
export const PLACEHOLDER_COLORS: TeamColors = { primary: '#2b313b', secondary: '#c9d0d9', accent: '#f5c63c' };

interface RawTeam extends Omit<Team, 'colors' | 'colorsVerified' | 'colorSource'> {
  colors: { primary: string; secondary: string; source: string | null } | null;
}

const base = () => import.meta.env.BASE_URL.replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base()}/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const loadIndex = () => getJson<DataIndex>('data/index.json');

export async function loadSeason(season: number): Promise<SeasonData> {
  const raw = await getJson<Omit<SeasonData, 'teams'> & { teams: RawTeam[] }>(`data/season-${season}.json`);
  return {
    ...raw,
    teams: raw.teams.map((t) => ({
      ...t,
      logo: t.logo ? `${base()}/${t.logo}` : null,
      colors: t.colors
        ? { primary: t.colors.primary, secondary: t.colors.secondary, accent: t.colors.secondary }
        : PLACEHOLDER_COLORS,
      colorsVerified: !!t.colors,
      colorSource: t.colors?.source ?? null,
    })),
  };
}

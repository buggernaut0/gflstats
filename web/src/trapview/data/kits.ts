import { luminance } from '../../lib/teamColors';
import type { TeamColors } from './types';

/** Konkrete Ausrüstungsfarben eines Teams für eine Partie. */
export interface Kit {
  jersey: string;
  number: string;
  numberOutline: string;
  trim: string;
  pants: string;
  helmet: string;
  helmetStripe: string;
  facemask: string;
  socks: string;
  shoes: string;
  gloves: string;
}

/**
 * Leitet aus den Teamfarben ein dunkles (Offense) oder helles (Defense) Trikot ab,
 * damit sich beide Teams immer klar unterscheiden – auch bei ähnlichen Hauptfarben.
 *
 * Wo das echte Heimtrikot von der Hauptfarbe abweicht (z. B. Potsdam: schwarzes Trikot, roter Helm),
 * stehen die Abweichungen in curation/teams.json unter colors.kit und werden hier übernommen.
 * Helm und Facemask gelten für beide Trikots, alles andere nur für das dunkle.
 */
export function resolveKit(colors: TeamColors, variant: 'dark' | 'light'): Kit {
  const k = colors.kit ?? {};
  const helmet = k.helmet ?? colors.primary;
  if (variant === 'dark') {
    const jersey = k.jersey ?? colors.primary;
    return {
      jersey,
      number: k.number ?? colors.secondary,
      numberOutline: k.numberOutline ?? jersey,
      trim: colors.secondary,
      pants: k.pants ?? colors.primary,
      helmet,
      helmetStripe: colors.secondary,
      facemask: k.facemask ?? colors.secondary,
      socks: '#e4e3de',
      shoes: '#0f1013',
      gloves: '#15161a',
    };
  }
  // Helles Trikot: Nummern in der Hauptfarbe – ist die zu hell (gelbe/goldene Teams), in der Zweitfarbe
  const ink = luminance(colors.primary) > 0.45 ? colors.secondary : colors.primary;
  return {
    jersey: '#e9e8e3',
    number: ink,
    numberOutline: ink === colors.primary ? colors.secondary : colors.primary,
    trim: colors.primary,
    pants: colors.primary,
    helmet,
    helmetStripe: colors.secondary,
    facemask: k.facemask ?? '#d5d7da',
    socks: '#e9e8e3',
    shoes: '#ecebe6',
    gloves: colors.primary,
  };
}

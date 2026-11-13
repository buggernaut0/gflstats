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
}

/**
 * Leitet aus den Teamfarben ein dunkles (Offense) oder helles (Defense) Trikot ab,
 * damit sich beide Teams immer klar unterscheiden – auch bei ähnlichen Hauptfarben.
 */
export function resolveKit(colors: TeamColors, variant: 'dark' | 'light'): Kit {
  if (variant === 'dark') {
    return {
      jersey: colors.primary,
      number: colors.secondary,
      numberOutline: colors.primary,
      trim: colors.secondary,
      pants: colors.primary,
      helmet: colors.primary,
      helmetStripe: colors.secondary,
      facemask: colors.secondary,
      socks: '#e4e3de',
    };
  }
  return {
    jersey: '#e9e8e3',
    number: colors.primary,
    numberOutline: colors.secondary,
    trim: colors.primary,
    pants: colors.primary,
    helmet: colors.primary,
    helmetStripe: colors.secondary,
    facemask: '#d5d7da',
    socks: '#e9e8e3',
  };
}

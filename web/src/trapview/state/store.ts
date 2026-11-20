import { create } from 'zustand';
import type { MessagePath } from '../../i18n/messages';

export type Phase = 'select' | 'entering' | 'cinema';

interface TrapViewState {
  phase: Phase;
  offenseId: string;
  defenseId: string;
  /** Aktives Duell oder null, wenn die Präsentation läuft. */
  matchupId: string | null;
  /** IDs der Spieler, deren Label gerade sichtbar ist (setzt der Kamera-Director). */
  visibleLabels: string[];
  /** Aktueller Abschnitt der Präsentation für die Bauchbinde. */
  /** sub: Untertitel als Text-Pfad in src/i18n (mit Werten), sonst subtitle */
  chapter: { index: number; shot: string; title: string; subtitle: string; sub?: { k: MessagePath; a?: unknown[] } } | null;
  /**
   * Laufendes Player Spotlight (setzt der Kamera-Director): Index in model.spotlights, Dauer der
   * Einstellung und ein Schlüssel, der sich bei jeder Wiederholung ändert (startet die Karten-Animation neu).
   */
  spotlight: { index: number; duration: number; key: string } | null;
  /**
   * Duell-Einstellung der laufenden Präsentation (setzt der Kamera-Director): ID des Matchups und ein
   * Schlüssel je Wiederholung. Beide Spielerprofile stehen ab dem ersten Bild der Einstellung.
   */
  duel: { id: string; key: string } | null;
  ended: boolean;
  volume: number;
  muted: boolean;
  /** Wird erhöht, um Timeline und Musik neu zu starten. */
  restartToken: number;

  setTeams: (offenseId: string, defenseId: string) => void;
  setPhase: (phase: Phase) => void;
  setMatchup: (id: string | null) => void;
  setVisibleLabels: (ids: string[]) => void;
  setChapter: (c: TrapViewState['chapter']) => void;
  setSpotlight: (s: TrapViewState['spotlight']) => void;
  setDuel: (d: TrapViewState['duel']) => void;
  setEnded: (ended: boolean) => void;
  setVolume: (v: number) => void;
  toggleMuted: () => void;
  restart: () => void;
  exit: () => void;
}

/** Stummschaltung bleibt über Neuladen hinweg erhalten. */
const MUTE_KEY = 'trap-view:muted';
function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
function writeMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* Speicher nicht verfügbar – Einstellung gilt nur für diese Sitzung */
  }
}

export const useTrapView = create<TrapViewState>((set) => ({
  phase: 'select',
  offenseId: '',
  defenseId: '',
  matchupId: null,
  visibleLabels: [],
  chapter: null,
  spotlight: null,
  duel: null,
  ended: false,
  volume: 0.7,
  muted: readMuted(),
  restartToken: 0,

  setTeams: (offenseId, defenseId) => set({ offenseId, defenseId }),
  setPhase: (phase) => set({ phase }),
  setMatchup: (matchupId) => set({ matchupId }),
  setVisibleLabels: (visibleLabels) => set({ visibleLabels }),
  setChapter: (chapter) => set({ chapter }),
  setSpotlight: (spotlight) => set({ spotlight }),
  setDuel: (duel) => set({ duel }),
  setEnded: (ended) => set({ ended }),
  setVolume: (volume) => set({ volume }),
  toggleMuted: () => set((s) => {
    writeMuted(!s.muted);
    return { muted: !s.muted };
  }),
  restart: () => set((s) => ({ restartToken: s.restartToken + 1, matchupId: null, spotlight: null, duel: null, ended: false })),
  exit: () => set({ phase: 'select', matchupId: null, visibleLabels: [], chapter: null, spotlight: null, duel: null, ended: false }),
}));

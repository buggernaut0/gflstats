import { create } from 'zustand';
import { isModelStyle, type ModelStyle } from '../players/styles';

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
  chapter: { index: number; title: string; subtitle: string } | null;
  ended: boolean;
  volume: number;
  muted: boolean;
  /** Wird erhöht, um Timeline und Musik neu zu starten. */
  restartToken: number;
  /** Darstellungsstil der Spieler */
  modelStyle: ModelStyle;

  setTeams: (offenseId: string, defenseId: string) => void;
  setPhase: (phase: Phase) => void;
  setMatchup: (id: string | null) => void;
  setVisibleLabels: (ids: string[]) => void;
  setChapter: (c: TrapViewState['chapter']) => void;
  setEnded: (ended: boolean) => void;
  setVolume: (v: number) => void;
  toggleMuted: () => void;
  restart: () => void;
  exit: () => void;
  setModelStyle: (s: ModelStyle) => void;
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

/** Modellstil: ?model=… in der Adresse hat Vorrang, sonst die letzte Wahl dieses Browsers. */
const STYLE_KEY = 'trap-view:model';
function readStyle(): ModelStyle {
  try {
    const q = new URLSearchParams(window.location.search).get('model');
    if (isModelStyle(q)) return q;
    const v = localStorage.getItem(STYLE_KEY);
    if (isModelStyle(v)) return v;
  } catch {
    /* Speicher nicht verfügbar */
  }
  return 'broadcast';
}
function writeStyle(s: ModelStyle) {
  try {
    localStorage.setItem(STYLE_KEY, s);
  } catch {
    /* nur für diese Sitzung */
  }
}

export const useTrapView = create<TrapViewState>((set) => ({
  phase: 'select',
  offenseId: '',
  defenseId: '',
  matchupId: null,
  visibleLabels: [],
  chapter: null,
  ended: false,
  volume: 0.7,
  muted: readMuted(),
  restartToken: 0,
  modelStyle: readStyle(),

  setTeams: (offenseId, defenseId) => set({ offenseId, defenseId }),
  setPhase: (phase) => set({ phase }),
  setMatchup: (matchupId) => set({ matchupId }),
  setVisibleLabels: (visibleLabels) => set({ visibleLabels }),
  setChapter: (chapter) => set({ chapter }),
  setEnded: (ended) => set({ ended }),
  setVolume: (volume) => set({ volume }),
  toggleMuted: () => set((s) => {
    writeMuted(!s.muted);
    return { muted: !s.muted };
  }),
  restart: () => set((s) => ({ restartToken: s.restartToken + 1, matchupId: null, ended: false })),
  exit: () => set({ phase: 'select', matchupId: null, visibleLabels: [], chapter: null, ended: false }),
  setModelStyle: (modelStyle) => {
    writeStyle(modelStyle);
    set({ modelStyle });
  },
}));

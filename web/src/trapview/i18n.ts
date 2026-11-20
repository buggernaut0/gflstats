/**
 * Trap-View-Daten in der gewählten Sprache: Kennzahl-Zeilen und Liga-Einordnung der Duelle, Gruppennamen.
 * Die exportierten Daten tragen deutsche Bezeichnungen; angezeigt wird über die Schlüssel (Kennzahl,
 * Kennzahlenfamilie, Profil) aus src/i18n – die Daten selbst bleiben unverändert.
 */
import type { I18n } from '../i18n/react';
import { STAT } from '../lib/stats';
import type { RankView, StatLine } from './matchup/compare';

/** Name und Kurzform einer Duell-Zeile (Originalspalte aus dem Katalog, Quoten aus trapview.derived). */
export function lineText(l: StatLine, f: I18n): { label: string; abbr: string } {
  const d = f.m.trapview.derived[l.key];
  if (d) return d;
  const def = STAT.get(l.key);
  return def ? { label: f.statLabel(def), abbr: f.statAbbr(def) } : { label: l.label, abbr: l.abbr };
}

/** Wert einer Duell-Zeile in der gewählten Sprache (raw = Zahl, digits = Nachkommastellen). */
export function lineValue(l: StatLine, f: I18n): string {
  if (l.raw == null) return l.value;
  const v = l.digits ? f.fmtDec(l.raw, l.digits) : f.fmt(l.raw);
  return l.key === 'cmp' ? (f.lang === 'en' ? `${v}%` : `${v} %`) : v;
}

export function lineSub(l: StatLine, f: I18n): string | null {
  return l.perGame == null ? null : f.m.trapview.perGame(f.fmtDec(l.perGame, 1));
}

/** Bezeichnung und Vergleichsgruppe einer Liga-Einordnung. */
export function rankText(r: RankView, f: I18n): { label: string; peers: string } {
  return f.m.trapview.families[r.family] ?? { label: r.label, peers: r.peers };
}

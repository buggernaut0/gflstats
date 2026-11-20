"use client";

/**
 * Kleine übersetzte Bausteine für Server-Komponenten, deren Text aus Daten zusammengesetzt wird
 * (Rollen, Mindestvolumen, Formeln, Elite-Gruppen). Alle Texte kommen aus src/i18n.
 */
import { useI18n } from "@/i18n/react";
import { ROLE_MIN, stat } from "@/lib/stats";
import type { EliteEntry } from "@/trapview/spotlight/elite";

export function RoleName({ role }: { role: string }) {
  const { m } = useI18n();
  return <>{m.stats.roles[role] ?? role}</>;
}

/** Positionsgruppe aus den Daten (QB, WR, DL …) als Langform. */
export function PositionName({ group }: { group: string }) {
  const { m } = useI18n();
  return <>{m.stats.positions[group] ?? group}</>;
}

/** Erläuterung zum Perzentil-Profil: Vergleichsgruppe, Saison, Mindestvolumen, Gruppengröße. */
export function QualifierText({ role, season, n }: { role: string; season: number; n: number }) {
  const { m } = useI18n();
  const min = ROLE_MIN[role];
  return <>{m.player.profileNote(m.stats.roles[role] ?? role, season, min ? m.stats.qualifier(min) : "", n)}</>;
}

/** Mindestvolumen einer Rolle ("mind. 75 Passversuche"). */
export function RoleQualifier({ role }: { role: string }) {
  const { m } = useI18n();
  const min = ROLE_MIN[role];
  return <>{min ? m.stats.qualifier(min) : ""}</>;
}

export function StatFormula({ k, kind }: { k: string; kind?: "dev" }) {
  const f = useI18n();
  const def = stat(k);
  const formula = f.m.stats.formula(def) || f.statLabel(def);
  return <>{kind === "dev" ? f.m.player.devNote(f.statLabel(def), formula) : formula}</>;
}

/** " (Platz 3 von 41 Quarterbacks)" – Gruppe in der gewählten Sprache. */
export function EliteGroup({ entry }: { entry: EliteEntry }) {
  const { m } = useI18n();
  const g = m.elite.groups[entry.profile];
  return <>{m.player.eliteRank(entry.rank, entry.of, g?.group ?? entry.group)}</>;
}

export function SourceNames({ names }: { names: string[] }) {
  const { m, lang } = useI18n();
  const q = lang === "de" ? names.map((n) => `„${n}“`) : names.map((n) => `“${n}”`);
  return <>{m.player.sourceNames(names.length, q.join(", "))}</>;
}

/** Playoff-Runde aus den Daten ("Halbfinale", "GFL Bowl", "Finale") in der gewählten Sprache. */
export function PlayoffRound({ name }: { name: string }) {
  const { m } = useI18n();
  return <>{m.games.rounds[name] ?? name}</>;
}

/** Datenquelle und Bereinigung im Fuß der Startseite. */
export function SourceLine({ builtAt, excluded, merged }: { builtAt: string; excluded: number; merged: number }) {
  const { m, fmtStamp } = useI18n();
  return <>{m.home.sourceLine(fmtStamp(builtAt), excluded, merged)}</>;
}

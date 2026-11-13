import type { DataIndex, MetricKey, Player, Rank, SeasonData, Stats } from '../data/types';
import type { ScenePlayer } from '../data/sceneModel';

/**
 * Vergleichslogik der Duelle – ausschließlich echte Werte aus den Statistikbögen.
 *
 * A) Positionsspezifisch: Jeder Spieler bekommt die Kennzahlen seiner Aufgabe (Receiver: Receptions,
 *    Yards, TD …; Passverteidiger: Interceptions, abgewehrte Pässe, Tackles …). Unterschiedliche
 *    Aufgaben werden nicht in eine gemeinsame Rangfolge gezwungen.
 * B) Positionsübergreifend: Die Liga-Einordnung. Jeder Spieler wird nur mit seiner eigenen
 *    Positionsgruppe verglichen (Perzentil einer einzigen, benannten Kennzahl pro Spiel). Erst diese
 *    normierten Werte (0–100) stehen nebeneinander – so lässt sich ablesen, wer in seiner Rolle
 *    herausragender ist, ohne Yards gegen Tackles aufzurechnen. Keine Gewichte, keine erfundenen Scores.
 * C) Direktes Aufeinandertreffen: Werte jedes Spielers aus den Spielen gegen das andere Team.
 *    Das ist Teamebene – die Bögen sagen nicht, wer wen gedeckt hat.
 */

/** Aufgabe eines Spielers in der Darstellung → Kennzahlenfamilie. */
export function familyOf(p: ScenePlayer): MetricKey | null {
  if (p.dataGroup === 'OL') return null;
  switch (p.slot.position) {
    case 'QB': return 'passing';
    case 'RB': return 'rushing';
    case 'WR': case 'TE': return 'receiving';
    case 'DE': case 'DT': return 'passrush';
    case 'LB': return 'tackling';
    case 'CB': case 'S': return 'coverage';
    default: return null;
  }
}

interface LineDef {
  key: string;
  /** abgeleitete Quote statt Spalte */
  derive?: (s: Stats) => number | null;
  label?: string;
  abbr?: string;
  digits?: number;
  perGame?: boolean;
  /** Spalten, die für die Quote erfasst sein müssen */
  needs?: string[];
}

const ratio = (a: string, b: string, scale = 1) => (s: Stats) => ((s[b] ?? 0) > 0 ? ((s[a] ?? 0) / s[b]) * scale : null);

const LINES: Record<MetricKey, LineDef[]> = {
  passing: [
    { key: 'passingyards', perGame: true },
    { key: 'touchdownpass' },
    { key: 'cmp', label: 'Completion-Quote', abbr: 'Cmp %', derive: ratio('complete', 'pass', 100), digits: 1, needs: ['complete', 'pass'] },
    { key: 'interception' },
  ],
  rushing: [
    { key: 'runyards', perGame: true },
    { key: 'touchdownrun' },
    { key: 'run' },
    { key: 'ypc', label: 'Yards pro Lauf', abbr: 'Y/Car', derive: ratio('runyards', 'run'), digits: 1, needs: ['runyards', 'run'] },
  ],
  receiving: [
    { key: 'receivingyards', perGame: true },
    { key: 'catched' },
    { key: 'touchdowncatch' },
    { key: 'ypr', label: 'Yards pro Catch', abbr: 'Y/Rec', derive: ratio('receivingyards', 'catched'), digits: 1, needs: ['receivingyards', 'catched'] },
  ],
  coverage: [
    { key: 'intercepted' },
    { key: 'brokenuppass' },
    { key: 'tackletotal', perGame: true },
    { key: 'forcedfumble' },
  ],
  tackling: [
    { key: 'tackletotal', perGame: true },
    { key: 'tackleforloss' },
    { key: 'sacktotal' },
    { key: 'forcedfumble' },
  ],
  passrush: [
    { key: 'sacktotal' },
    { key: 'tackleforloss' },
    { key: 'qbhurrybydefense' },
    { key: 'tackletotal', perGame: true },
  ],
};

export interface StatLine { key: string; label: string; /** Kurzform wie auf der Website ("Rec Yds", "INT") */ abbr: string; value: string; sub: string | null }

const nf = (x: number, digits = 0) =>
  x.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** Halbe Tackles/Sacks (Assists) behalten ihre Nachkommastelle, ganze Zahlen nicht. */
const count = (x: number) => (Number.isInteger(x) ? nf(x) : nf(x, 1));

export function statLines(p: Player, family: MetricKey, index: DataIndex, season: SeasonData, stats: Stats = p.stats, games = p.games): StatLine[] {
  const has = (k: string) => season.available.includes(k);
  const out: StatLine[] = [];
  for (const d of LINES[family]) {
    if (d.derive) {
      if (!(d.needs ?? []).every(has)) continue;
      const x = d.derive(stats);
      out.push({ key: d.key, label: d.label!, abbr: d.abbr ?? d.label!, value: x == null ? '–' : `${nf(x, d.digits ?? 1)}${d.key === 'cmp' ? ' %' : ''}`, sub: null });
      continue;
    }
    if (!has(d.key)) continue; // in dieser Saison nicht erfasst → nicht zeigen (nie als 0)
    const x = stats[d.key] ?? 0;
    out.push({
      key: d.key,
      label: index.fields[d.key]?.label ?? d.key,
      abbr: index.fields[d.key]?.abbr ?? d.key,
      value: count(x),
      sub: d.perGame && games > 0 ? `${nf(x / games, 1)} / Spiel` : null,
    });
  }
  return out;
}

export interface RankView { family: MetricKey; label: string; peers: string; rank: Rank }

export function rankOf(p: Player, family: MetricKey, index: DataIndex): RankView | null {
  const r = p.ranks[family];
  if (!r) return null;
  const m = index.method.metrics[family];
  return { family, label: m.label, peers: m.peers, rank: r };
}

export interface HeadToHead { games: number; lines: StatLine[] }

/** Werte aus den Spielen gegen das gegnerische Team dieser Partie (falls es solche Spiele gab). */
export function headToHead(p: ScenePlayer, opponentId: string, family: MetricKey, index: DataIndex, season: SeasonData): HeadToHead | null {
  const vs = p.player?.vs[opponentId];
  if (!p.player || !vs) return null;
  const lines = statLines(p.player, family, index, season, vs.stats, vs.games).slice(0, 3).map((l) => ({ ...l, sub: null }));
  return { games: vs.games, lines };
}

/**
 * Player Spotlight – Bewertungsmodell.
 *
 * Ermittelt je Team bis zu drei herausragende Offense- bzw. Defense-Spieler aus den Saisonwerten der
 * Statistikbögen. Einzige Stelle mit Bewertungsregeln: Gewichte, Kennzahlen, Schwellen und Profile
 * stehen hier (PROFILES, METRICS, SPOTLIGHT_RULES). Die Darstellung liest nur das Ergebnis.
 * Läuft beim Datenexport (scripts/trapview/export-data.ts, Node mit Type-Stripping) und in Tests –
 * deshalb ohne Imports und ohne TypeScript-Sonderformen (enum, namespace, Parameter-Properties).
 *
 * Verfahren (je Saison, nie über Saisons gemischt):
 *   1. Vergleichsgruppen je Profil: alle Spieler der Liga mit derselben aus der Statistik abgeleiteten
 *      Rolle (QB, RB, WR/TE, DEF), mind. POOL_MIN_GAMES Spiele und dem Mindestvolumen des Profils.
 *   2. Jede Kennzahl ist entweder ein Wert pro Spiel oder eine Quote (z. B. Yards pro Carry). Kleine
 *      Stichproben werden zum Ligaschnitt der Gruppe gezogen (empirischer Bayes-Ansatz):
 *        pro Spiel:  (Summe + k · Schnitt pro Spiel) / (Spiele + k)        k = PRIOR_GAMES
 *        Quote:      (Zähler + k · Gruppenquote) / (Nenner + k)            k = prior der Kennzahl
 *      So hat ein Spieler mit 2 Spielen und einem Ausreißer keinen Vorteil, und Vielspieler werden
 *      nicht über Summen bevorzugt (alles ist pro Spiel bzw. pro Versuch).
 *   3. Perzentil innerhalb der Gruppe (Anteil mit schlechterem Wert, Gleichstand halb). Kennzahlen mit
 *      „weniger ist besser“ (INT-Quote, verlorene Fumbles, Drops) werden umgedreht.
 *   4. Profilwert = gewichteter Mittelwert der Perzentile (0–100). Fehlt eine Spalte in der Saison,
 *      entfällt die Kennzahl und die übrigen Gewichte werden neu normiert. Ein einzelner Spitzenwert
 *      reicht dadurch nicht – das Profil muss in mehreren Kennzahlen tragen.
 *   5. Defense ohne offiziellen Kader („DEF“): Die Daten trennen DL, LB und DB nicht. Jeder Verteidiger
 *      wird in drei Statistikprofilen bewertet (Pass Rush, Tackling, Coverage) und zählt mit dem besten.
 *      Mit Kader sind nur die zur Position passenden Profile erlaubt (DL: Pass Rush/Tackling usw.).
 *   6. Auswahl: Kandidaten sind nur Spieler der Starting Lineup (sie stehen auf dem Feld). Sortiert nach
 *      Profilwert × Gewicht der Position (QB leicht höher, siehe impact). Wer unter MIN_SCORE bleibt,
 *      wird nicht als Star vorgestellt – lieber weniger als drei Karten als ein erfundener „Star“.
 *      Hat eine Seite gar niemanden darüber, erscheint höchstens ihr bester Spieler als „Schlüsselspieler“
 *      (mind. KEY_SCORE, mit Liga-Rang auf der Karte).
 *   7. Gründe: die drei Kennzahlen mit dem größten Beitrag (Gewicht × Perzentil), angezeigt mit den
 *      echten, ungeglätteten Saisonwerten.
 */

export type Stats = Record<string, number>;

/** Saisonwerte eines Spielers für ein Team (Grundlage der Vergleichsgruppen). */
export interface PoolPlayer {
  id: string;
  team: string;
  /** Aus der Statistik abgeleitete Rolle der Website: QB, RB, WR/TE, DEF, K, P oder null */
  role: string | null;
  games: number;
  stats: Stats;
}

/** Ein Spieler der Starting Lineup, der vorgestellt werden könnte. */
export interface SpotlightCandidate {
  id: string;
  /** Positionsgruppe der Lineup: QB, RB, WR, TE, REC, DL, LB, DB, DEF */
  group: string;
}

export type MetricId =
  | 'pass_yds' | 'pass_td' | 'ypa' | 'cmp_pct' | 'int_rate' | 'qb_rush_yds' | 'fum_rate'
  | 'rush_yds' | 'rush_td' | 'ypc' | 'rec_yds' | 'rec' | 'rec_td' | 'ypr' | 'catch_rate' | 'drop_rate'
  | 'tackles' | 'tfl' | 'sacks' | 'hurries' | 'ff' | 'ints' | 'pbu' | 'ball';

export type ProfileId = 'qb' | 'rb' | 'rec' | 'rusher' | 'tackler' | 'coverage';

const v = (s: Stats, k: string) => s[k] ?? 0;

interface MetricDef {
  label: string;
  /** perGame: Zähler pro Spiel; rate: Zähler / Nenner */
  kind: 'perGame' | 'rate';
  num: (s: Stats) => number;
  den?: (s: Stats) => number;
  /** Glättung für Quoten: so viele „Versuche“ zum Gruppenschnitt (pro-Spiel-Werte nutzen PRIOR_GAMES) */
  prior?: number;
  /** Bezeichnung des Nenners für die Anzeige („bei 312 Passversuchen“) */
  denLabel?: string;
  /** Mindest-Nenner, damit eine Quote überhaupt als Grund angezeigt wird */
  minDen?: number;
  better: 'high' | 'low';
  /** Spalten, die in der Saison erfasst sein müssen */
  requires: string[];
  /** Anzeige: Saisonsumme, Quote mit Nachkommastelle oder Prozent */
  display: 'total' | 'rate' | 'percent';
}

/** Alle Kennzahlen – ausschließlich echte Spalten der Statistikbögen. */
export const METRICS: Record<MetricId, MetricDef> = {
  pass_yds: { label: 'Passing Yards', kind: 'perGame', num: (s) => v(s, 'passingyards'), better: 'high', requires: ['passingyards'], display: 'total' },
  pass_td: { label: 'Passing TD', kind: 'perGame', num: (s) => v(s, 'touchdownpass'), better: 'high', requires: ['touchdownpass'], display: 'total' },
  ypa: { denLabel: 'Passversuchen', label: 'Yards pro Pass', kind: 'rate', num: (s) => v(s, 'passingyards'), den: (s) => v(s, 'pass'), prior: 60, minDen: 50, better: 'high', requires: ['passingyards', 'pass'], display: 'rate' },
  cmp_pct: { denLabel: 'Passversuchen', label: 'Completion %', kind: 'rate', num: (s) => v(s, 'complete'), den: (s) => v(s, 'pass'), prior: 60, minDen: 50, better: 'high', requires: ['complete', 'pass'], display: 'percent' },
  int_rate: { denLabel: 'Passversuchen', label: 'INT-Quote', kind: 'rate', num: (s) => v(s, 'interception'), den: (s) => v(s, 'pass'), prior: 60, minDen: 50, better: 'low', requires: ['interception', 'pass'], display: 'percent' },
  qb_rush_yds: { label: 'Rushing Yards', kind: 'perGame', num: (s) => v(s, 'runyards'), better: 'high', requires: ['runyards'], display: 'total' },
  fum_rate: { denLabel: 'Ballkontakten', label: 'Fumbles verloren pro Ballkontakt', kind: 'rate', num: (s) => v(s, 'fumbledandlost'), den: (s) => v(s, 'run') + v(s, 'catched') + v(s, 'pass'), prior: 80, minDen: 40, better: 'low', requires: ['fumbledandlost'], display: 'percent' },
  rush_yds: { label: 'Rushing Yards', kind: 'perGame', num: (s) => v(s, 'runyards'), better: 'high', requires: ['runyards'], display: 'total' },
  rush_td: { label: 'Rushing TD', kind: 'perGame', num: (s) => v(s, 'touchdownrun'), better: 'high', requires: ['touchdownrun'], display: 'total' },
  ypc: { denLabel: 'Carries', label: 'Yards pro Carry', kind: 'rate', num: (s) => v(s, 'runyards'), den: (s) => v(s, 'run'), prior: 40, minDen: 25, better: 'high', requires: ['runyards', 'run'], display: 'rate' },
  rec_yds: { label: 'Receiving Yards', kind: 'perGame', num: (s) => v(s, 'receivingyards'), better: 'high', requires: ['receivingyards'], display: 'total' },
  rec: { label: 'Receptions', kind: 'perGame', num: (s) => v(s, 'catched'), better: 'high', requires: ['catched'], display: 'total' },
  rec_td: { label: 'Receiving TD', kind: 'perGame', num: (s) => v(s, 'touchdowncatch'), better: 'high', requires: ['touchdowncatch'], display: 'total' },
  ypr: { denLabel: 'Catches', label: 'Yards pro Catch', kind: 'rate', num: (s) => v(s, 'receivingyards'), den: (s) => v(s, 'catched'), prior: 12, minDen: 10, better: 'high', requires: ['receivingyards', 'catched'], display: 'rate' },
  catch_rate: { denLabel: 'Targets', label: 'Catch-Quote', kind: 'rate', num: (s) => v(s, 'catched'), den: (s) => v(s, 'intended'), prior: 20, minDen: 15, better: 'high', requires: ['catched', 'intended'], display: 'percent' },
  drop_rate: { denLabel: 'Targets', label: 'Drop-Quote', kind: 'rate', num: (s) => v(s, 'droppedpass'), den: (s) => v(s, 'intended'), prior: 20, minDen: 15, better: 'low', requires: ['droppedpass', 'intended'], display: 'percent' },
  tackles: { label: 'Tackles', kind: 'perGame', num: (s) => v(s, 'tackletotal'), better: 'high', requires: ['tackletotal'], display: 'total' },
  tfl: { label: 'Tackles for Loss', kind: 'perGame', num: (s) => v(s, 'tackleforloss'), better: 'high', requires: ['tackleforloss'], display: 'total' },
  sacks: { label: 'Sacks', kind: 'perGame', num: (s) => v(s, 'sacktotal'), better: 'high', requires: ['sacktotal'], display: 'total' },
  hurries: { label: 'QB Hurries', kind: 'perGame', num: (s) => v(s, 'qbhurrybydefense'), better: 'high', requires: ['qbhurrybydefense'], display: 'total' },
  ff: { label: 'Forced Fumbles', kind: 'perGame', num: (s) => v(s, 'forcedfumble'), better: 'high', requires: ['forcedfumble'], display: 'total' },
  ints: { label: 'Interceptions', kind: 'perGame', num: (s) => v(s, 'intercepted'), better: 'high', requires: ['intercepted'], display: 'total' },
  pbu: { label: 'Abgewehrte Pässe', kind: 'perGame', num: (s) => v(s, 'brokenuppass'), better: 'high', requires: ['brokenuppass'], display: 'total' },
  ball: { label: 'INT + abgewehrte Pässe', kind: 'perGame', num: (s) => v(s, 'intercepted') + v(s, 'brokenuppass'), better: 'high', requires: ['intercepted', 'brokenuppass'], display: 'total' },
};

interface ProfileDef {
  /** Name des Profils auf der Karte */
  label: string;
  /** Vergleichsgruppe im Plural, z. B. „Quarterbacks“ */
  peers: string;
  unit: 'offense' | 'defense';
  /** Statistik-Rolle der Vergleichsgruppe */
  role: string;
  minVolume: (s: Stats) => boolean;
  minLabel: string;
  /** Gewicht der Position bei der Auswahl zwischen Positionen (1 = neutral) */
  impact: number;
  metrics: [MetricId, number][];
}

/**
 * Bewertungsprofile. Gewichte sind Annahmen (keine aus den Daten geschätzten Werte) und hier
 * zentral anpassbar; sie müssen nicht 1 ergeben (werden normiert).
 */
export const PROFILES: Record<ProfileId, ProfileDef> = {
  qb: {
    label: 'Quarterback', peers: 'Quarterbacks', unit: 'offense', role: 'QB',
    minVolume: (s) => v(s, 'pass') >= 50, minLabel: 'mind. 50 Passversuche',
    impact: 1.05,
    metrics: [['pass_yds', 0.24], ['pass_td', 0.2], ['ypa', 0.16], ['int_rate', 0.14], ['cmp_pct', 0.1], ['qb_rush_yds', 0.1], ['fum_rate', 0.06]],
  },
  rb: {
    label: 'Running Back', peers: 'Running Backs', unit: 'offense', role: 'RB',
    minVolume: (s) => v(s, 'run') + v(s, 'catched') >= 25, minLabel: 'mind. 25 Ballkontakte',
    impact: 1,
    metrics: [['rush_yds', 0.32], ['rush_td', 0.2], ['ypc', 0.2], ['rec_yds', 0.16], ['fum_rate', 0.12]],
  },
  rec: {
    label: 'Receiver', peers: 'Receivern (WR/TE)', unit: 'offense', role: 'WR/TE',
    minVolume: (s) => v(s, 'catched') >= 10, minLabel: 'mind. 10 Receptions',
    impact: 1,
    metrics: [['rec_yds', 0.3], ['rec_td', 0.2], ['rec', 0.16], ['ypr', 0.14], ['catch_rate', 0.1], ['drop_rate', 0.1]],
  },
  rusher: {
    label: 'Pass Rusher', peers: 'Verteidigern', unit: 'defense', role: 'DEF',
    minVolume: (s) => v(s, 'tackletotal') >= 8, minLabel: 'mind. 8 Tackles',
    impact: 1,
    metrics: [['sacks', 0.34], ['tfl', 0.28], ['tackles', 0.16], ['ff', 0.12], ['hurries', 0.1]],
  },
  tackler: {
    label: 'Tackler', peers: 'Verteidigern', unit: 'defense', role: 'DEF',
    minVolume: (s) => v(s, 'tackletotal') >= 8, minLabel: 'mind. 8 Tackles',
    impact: 1,
    metrics: [['tackles', 0.44], ['tfl', 0.22], ['ball', 0.14], ['sacks', 0.1], ['ff', 0.1]],
  },
  coverage: {
    label: 'Ballhawk', peers: 'Verteidigern', unit: 'defense', role: 'DEF',
    minVolume: (s) => v(s, 'tackletotal') >= 8, minLabel: 'mind. 8 Tackles',
    impact: 1,
    metrics: [['ints', 0.34], ['pbu', 0.3], ['tackles', 0.2], ['ff', 0.16]],
  },
};

/** Welche Profile eine Positionsgruppe der Lineup haben darf. Ohne Kader (REC, DEF) alle passenden. */
export const PROFILES_BY_GROUP: Record<string, ProfileId[]> = {
  QB: ['qb'],
  RB: ['rb'],
  WR: ['rec'], TE: ['rec'], REC: ['rec'],
  DL: ['rusher', 'tackler'],
  LB: ['tackler', 'rusher', 'coverage'],
  DB: ['coverage', 'tackler'],
  DEF: ['rusher', 'tackler', 'coverage'],
};

export const SPOTLIGHT_RULES = {
  /** höchstens so viele Spieler je Seite */
  perUnit: 3,
  /** Mindestspiele für eine Vergleichsgruppe */
  POOL_MIN_GAMES: 3,
  /** Glättung pro-Spiel-Werte: so viele „Spiele“ Ligaschnitt kommen hinzu */
  PRIOR_GAMES: 3,
  /** Mindest-Profilwert (0–100), um als herausragend vorgestellt zu werden */
  MIN_SCORE: 60,
  /** ab hier „Elite“ statt „Star“ */
  ELITE_SCORE: 80,
  /**
   * Erreicht auf einer Seite niemand MIN_SCORE, wird höchstens ein Schlüsselspieler gezeigt – der beste
   * des Teams, sofern er mindestens Ligamittel (KEY_SCORE) erreicht. Die Karte nennt ihn ausdrücklich so
   * und zeigt seinen Liga-Rang; als „Star“ wird er nicht ausgegeben.
   */
  KEY_SCORE: 45,
  /** Mindestgröße einer Vergleichsgruppe */
  MIN_POOL: 8,
  /** angezeigte Gründe je Spieler */
  reasons: 3,
};

// ─────────────────────────────────────────────────────────── Ergebnis

export interface SpotlightReason {
  metric: MetricId;
  label: string;
  /** echter Saisonwert: Summe (display total) oder Quote (rate/percent, Prozent als 0–1) */
  value: number;
  display: MetricDef['display'];
  /** pro Spiel (nur bei Summen) */
  perGame: number | null;
  /** Nenner bei Quoten, z. B. Passversuche */
  den: number | null;
  denLabel: string | null;
  better: 'high' | 'low';
  /** Perzentil in der Vergleichsgruppe (0–100, höher = besser) */
  pct: number;
}

export interface SpotlightPick {
  id: string;
  group: string;
  profile: ProfileId;
  profileLabel: string;
  /** elite ≥ ELITE_SCORE, star ≥ MIN_SCORE, key = bester Spieler einer Seite ohne Star */
  tier: 'elite' | 'star' | 'key';
  /** Profilwert 0–100 (gewichtetes Perzentil) */
  score: number;
  /** Rang des Profilwerts in der Vergleichsgruppe (1 = bester) */
  rank: number;
  of: number;
  peers: string;
  games: number;
  reasons: SpotlightReason[];
  /** alle Kennzahlen des Profils, für die Methodik-Ansicht */
  metrics: { metric: MetricId; label: string; weight: number; pct: number }[];
}

// ─────────────────────────────────────────────────────────── Vergleichsgruppen

interface PoolStat { mean: number }
interface ProfilePool {
  members: PoolPlayer[];
  metrics: { id: MetricId; weight: number; def: MetricDef; base: PoolStat; sorted: number[] }[];
  /** Profilwerte aller Mitglieder, absteigend – für den Rang */
  scores: number[];
}

export interface SeasonPools {
  profiles: Partial<Record<ProfileId, ProfilePool>>;
  byKey: Map<string, PoolPlayer>;
}

const eligible = (p: PoolPlayer, prof: ProfileDef) => p.games >= SPOTLIGHT_RULES.POOL_MIN_GAMES && prof.minVolume(p.stats);

/** Geglätteter Wert einer Kennzahl (null = nicht berechenbar, z. B. Quote ohne Nenner in der Gruppe). */
function shrunk(def: MetricDef, base: PoolStat, p: PoolPlayer): number {
  if (def.kind === 'perGame') {
    const k = SPOTLIGHT_RULES.PRIOR_GAMES;
    return (def.num(p.stats) + k * base.mean) / (p.games + k);
  }
  const k = def.prior ?? 30;
  return (def.num(p.stats) + k * base.mean) / (def.den!(p.stats) + k);
}

function baseOf(def: MetricDef, members: PoolPlayer[]): PoolStat {
  if (def.kind === 'perGame') {
    const games = members.reduce((t, p) => t + p.games, 0);
    return { mean: games ? members.reduce((t, p) => t + def.num(p.stats), 0) / games : 0 };
  }
  const den = members.reduce((t, p) => t + def.den!(p.stats), 0);
  return { mean: den ? members.reduce((t, p) => t + def.num(p.stats), 0) / den : 0 };
}

/** Perzentil (0–100) von x in einer aufsteigend sortierten Liste; Gleichstand zählt halb. */
function percentile(sorted: number[], x: number, better: 'high' | 'low', selfIncluded: boolean): number {
  const eps = 1e-9;
  let below = 0;
  let equal = 0;
  for (const y of sorted) {
    if (y < x - eps) below++;
    else if (y <= x + eps) equal++;
  }
  if (selfIncluded) equal -= 1;
  const n = sorted.length - (selfIncluded ? 1 : 0);
  if (n <= 0) return 50;
  const above = n - below - equal;
  const worse = better === 'high' ? below : above;
  return ((worse + 0.5 * equal) / n) * 100;
}

function profileScore(pool: ProfilePool, p: PoolPlayer, selfIncluded: boolean) {
  let sum = 0;
  let wsum = 0;
  const parts: { id: MetricId; def: MetricDef; weight: number; pct: number }[] = [];
  for (const m of pool.metrics) {
    const pct = percentile(m.sorted, shrunk(m.def, m.base, p), m.def.better, selfIncluded);
    parts.push({ id: m.id, def: m.def, weight: m.weight, pct });
    sum += m.weight * pct;
    wsum += m.weight;
  }
  return { score: wsum ? sum / wsum : 0, parts };
}

/**
 * Baut die Vergleichsgruppen einer Saison.
 * @param available in dieser Saison erfasste Spalten (meta.json → availability)
 */
export function buildPools(players: PoolPlayer[], available: Iterable<string>): SeasonPools {
  const have = new Set(available);
  const profiles: SeasonPools['profiles'] = {};
  for (const [id, prof] of Object.entries(PROFILES) as [ProfileId, ProfileDef][]) {
    const members = players.filter((p) => p.role === prof.role && eligible(p, prof));
    if (members.length < SPOTLIGHT_RULES.MIN_POOL) continue;
    const metrics = prof.metrics
      .filter(([mid]) => METRICS[mid].requires.every((c) => have.has(c)))
      .map(([mid, weight]) => {
        const def = METRICS[mid];
        const base = baseOf(def, members);
        return { id: mid, weight, def, base, sorted: members.map((p) => shrunk(def, base, p)).sort((a, b) => a - b) };
      });
    const pool: ProfilePool = { members, metrics, scores: [] };
    pool.scores = members.map((p) => profileScore(pool, p, true).score).sort((a, b) => b - a);
    profiles[id] = pool;
  }
  return { profiles, byKey: new Map(players.map((p) => [`${p.id}|${p.team}`, p])) };
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Bewertet einen Spieler in einem Profil; null, wenn er die Voraussetzungen der Gruppe nicht erfüllt. */
export function scorePlayer(pools: SeasonPools, p: PoolPlayer, profile: ProfileId): SpotlightPick | null {
  const pool = pools.profiles[profile];
  const prof = PROFILES[profile];
  if (!pool || !eligible(p, prof)) return null;
  const selfIncluded = pool.members.includes(p);
  const { score, parts } = profileScore(pool, p, selfIncluded);
  const rank = pool.scores.filter((s) => s > score + 1e-9).length + 1;
  const of = pool.scores.length + (selfIncluded ? 0 : 1);

  const reasons = parts
    .filter((m) => m.def.kind === 'perGame' ? m.def.num(p.stats) > 0 || m.def.better === 'low' : m.def.den!(p.stats) >= (m.def.minDen ?? 1))
    .sort((a, b) => b.weight * b.pct - a.weight * a.pct)
    .slice(0, SPOTLIGHT_RULES.reasons)
    .map((m): SpotlightReason => {
      const num = m.def.num(p.stats);
      const den = m.def.den ? m.def.den(p.stats) : null;
      return {
        metric: m.id,
        label: m.def.label,
        value: m.def.kind === 'perGame' ? r2(num) : den ? num / den : 0,
        display: m.def.display,
        perGame: m.def.kind === 'perGame' ? r2(num / p.games) : null,
        den,
        denLabel: m.def.denLabel ?? null,
        better: m.def.better,
        pct: Math.round(m.pct),
      };
    });

  return {
    id: p.id,
    group: '',
    profile,
    profileLabel: prof.label,
    tier: score >= SPOTLIGHT_RULES.ELITE_SCORE ? 'elite' : score >= SPOTLIGHT_RULES.MIN_SCORE ? 'star' : 'key',
    score: Math.round(score * 10) / 10,
    rank,
    of,
    peers: prof.peers,
    games: p.games,
    reasons,
    metrics: parts.map((m) => ({ metric: m.id, label: m.def.label, weight: m.weight, pct: Math.round(m.pct) })),
  };
}

/**
 * Bis zu drei herausragende Spieler einer Seite.
 * @param candidates Spieler der Starting Lineup dieser Seite (nur sie stehen auf dem Feld)
 */
export function pickSpotlight(pools: SeasonPools, team: string, candidates: SpotlightCandidate[]): SpotlightPick[] {
  const ranked: { pick: SpotlightPick; value: number }[] = [];
  for (const c of candidates) {
    const p = pools.byKey.get(`${c.id}|${team}`);
    if (!p) continue;
    let best: SpotlightPick | null = null;
    for (const prof of PROFILES_BY_GROUP[c.group] ?? []) {
      const s = scorePlayer(pools, p, prof);
      if (s && (!best || s.score > best.score)) best = s;
    }
    if (!best) continue;
    best.group = c.group;
    ranked.push({ pick: best, value: best.score * PROFILES[best.profile].impact });
  }
  ranked.sort((a, b) => b.value - a.value || a.pick.id.localeCompare(b.pick.id));
  const stars = ranked.filter((x) => x.pick.score >= SPOTLIGHT_RULES.MIN_SCORE).slice(0, SPOTLIGHT_RULES.perUnit);
  if (stars.length) return stars.map((x) => x.pick);
  const key = ranked.find((x) => x.pick.score >= SPOTLIGHT_RULES.KEY_SCORE);
  return key ? [{ ...key.pick, tier: 'key' }] : [];
}

/** Kurzbeschreibung der Methodik für index.json (Anzeige auf der Karte / Methodik). */
export function describeMethod() {
  return {
    rules: { ...SPOTLIGHT_RULES },
    profiles: Object.fromEntries(
      (Object.entries(PROFILES) as [ProfileId, ProfileDef][]).map(([id, p]) => [
        id,
        { label: p.label, peers: p.peers, minLabel: p.minLabel, impact: p.impact, metrics: p.metrics.map(([m, w]) => ({ metric: m, label: METRICS[m].label, weight: w, better: METRICS[m].better })) },
      ]),
    ),
  };
}

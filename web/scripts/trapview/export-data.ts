/**
 * Trap View – Datenexport.
 *
 *   npm run data          (läuft auch automatisch vor `npm run dev` und `npm run build`)
 *
 * Quelle sind ausschließlich die Website-Daten, die scripts/build_data.py nur lesend aus gflstats.db
 * erzeugt (web/public/data/*). Dort sind Namensbereinigung, zusammengeführte Spieler, ausgeschlossene
 * Spiele, Kader (Rückennummern/Positionen) und belegte Teamfarben bereits angewendet und gegen die
 * Datenbank geprüft. Die Datenbank selbst wird hier nicht angefasst.
 *
 * Die Starting Lineups kommen aus derselben Funktion wie auf der Website (web/src/lib/lineup.ts) –
 * eine Methodik, eine Implementierung. Dieses Skript ergänzt nur, was die 3D-Ansicht zusätzlich braucht:
 *   - Saisonwerte je Spieler (für die Vergleichsfenster),
 *   - die Liga-Einordnung (Rang/Perzentil innerhalb der eigenen Positionsgruppe),
 *   - Werte aus den Spielen gegen jeden einzelnen Gegner (direktes Aufeinandertreffen der Teams).
 *
 * Ausgabe (wird bei jedem Lauf neu erzeugt, nicht im Git):
 *   web/public/trapview/data/index.json          Saisons, Feldnamen, Methodik
 *   web/public/trapview/data/season-<jahr>.json  Teams, Aufstellungen und Spielerwerte einer Saison
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MIN_GAME_SHARE,
  PROVISIONAL_SLOTS,
  REGULAR_GAME_SHARE,
  SLOTS,
  provisionalLineup,
  startingLineup,
  type Lineup,
  type LineupPlayer,
  type TeamRoster,
} from '../../src/lib/lineup.ts';
import { buildPools, describeMethod, pickSpotlight, type SpotlightPick } from '../../src/trapview/spotlight/scoring.ts';

type Stats = Record<string, number>;
interface PgRow { g: string; p: string; t: string; s: Stats }

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const WEB_DATA = join(REPO, 'web', 'public', 'data');
const WEB_PUBLIC = join(REPO, 'web', 'public');
const FIELDS = join(REPO, 'web', 'src', 'config', 'fields.json');
const OUT_DIR = join(HERE, '..', '..', 'public', 'trapview', 'data');

if (!existsSync(join(WEB_DATA, 'meta.json'))) {
  console.error(
    '\nTrap View: Website-Daten fehlen (web/public/data).\n' +
    'Bitte einmal aus dem Repo-Hauptordner ausführen:  python scripts/build_data.py\n',
  );
  process.exit(1);
}

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf-8')) as T;

interface WebTeam {
  id: string; name: string; short: string | null; abbr: string;
  colors: { primary?: string; secondary?: string; source?: string; note?: string } | null;
  logo: string | null;
}
interface WebPlayer {
  id: string; name: string; shared: boolean;
  seasons: { season: number; teams: string[]; games: number; role: string | null }[];
}
interface WebGame { id: string; season: number; home: string; away: string }
interface Field { key: string; label: string; abbr: string; agg: 'sum' | 'max' }

const meta = read<{ seasons: number[]; currentSeason: number; availability: Record<string, number[]>; builtAt: string; source: Record<string, string> }>(join(WEB_DATA, 'meta.json'));
const teams = read<WebTeam[]>(join(WEB_DATA, 'teams.json'));
const players = read<WebPlayer[]>(join(WEB_DATA, 'players.json'));
const games = read<WebGame[]>(join(WEB_DATA, 'games.json'));
const rosters = read<Record<string, Record<string, TeamRoster>>>(join(WEB_DATA, 'rosters.json'));
const fields = read<{ fields: Field[] }>(FIELDS).fields;
const MAX_FIELDS = new Set(fields.filter((f) => f.agg === 'max').map((f) => f.key));

const playerById = new Map(players.map((p) => [p.id, p]));
const gameById = new Map(games.map((g) => [g.id, g]));

/** Werte, die die 3D-Ansicht zeigt. Alles andere bleibt in der Website. */
const KEEP = [
  'pass', 'complete', 'passingyards', 'touchdownpass', 'interception', 'longestpass',
  'run', 'runyards', 'touchdownrun', 'longestrun',
  'catched', 'receivingyards', 'touchdowncatch', 'longestcatch', 'yac', 'droppedpass',
  'tackletotal', 'tackleforloss', 'sacktotal', 'intercepted', 'brokenuppass', 'forcedfumble',
  'qbhurrybydefense', 'interceptionreturnyards',
  'fumbled', 'fumbledandlost', 'touchdown',
];

const v = (s: Stats, k: string) => s[k] ?? 0;
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

function pick(s: Stats): Stats {
  const out: Stats = {};
  for (const k of KEEP) if (s[k] !== undefined) out[k] = s[k];
  return out;
}

function addStats(into: Stats, s: Stats) {
  for (const [k, x] of Object.entries(s)) {
    into[k] = MAX_FIELDS.has(k) ? Math.max(into[k] ?? 0, x) : round((into[k] ?? 0) + x);
  }
}

// ─────────────────────────────────────────────────────────── Liga-Einordnung

/**
 * Kennzahlen für die Einordnung innerhalb der eigenen Positionsgruppe. Jede Kennzahl ist ein Wert pro
 * Spiel aus genau einer oder zwei Statistikspalten; verglichen wird nur mit Spielern derselben
 * (aus der Statistik abgeleiteten) Rolle. Keine Gewichtung, keine zusammengesetzten Scores.
 */
const METRICS = {
  passing:   { label: 'Passing Yards pro Spiel', peers: 'Quarterbacks', role: 'QB', value: (s: Stats) => v(s, 'passingyards'), inPool: () => true },
  rushing:   { label: 'Rushing Yards pro Spiel', peers: 'Running Backs', role: 'RB', value: (s: Stats) => v(s, 'runyards'), inPool: () => true },
  receiving: { label: 'Receiving Yards pro Spiel', peers: 'Receivern (WR/TE)', role: 'WR/TE', value: (s: Stats) => v(s, 'receivingyards'), inPool: () => true },
  coverage:  { label: 'Interceptions + abgewehrte Pässe pro Spiel', peers: 'Verteidigern mit mind. 1 INT oder abgewehrtem Pass', role: 'DEF', value: (s: Stats) => v(s, 'intercepted') + v(s, 'brokenuppass'), inPool: (s: Stats) => v(s, 'intercepted') + v(s, 'brokenuppass') > 0 },
  tackling:  { label: 'Tackles pro Spiel', peers: 'Verteidigern', role: 'DEF', value: (s: Stats) => v(s, 'tackletotal'), inPool: () => true },
  passrush:  { label: 'Sacks + Tackles for Loss pro Spiel', peers: 'Verteidigern mit mind. 1 Sack oder TFL', role: 'DEF', value: (s: Stats) => v(s, 'sacktotal') + v(s, 'tackleforloss'), inPool: (s: Stats) => v(s, 'sacktotal') + v(s, 'tackleforloss') > 0 },
} as const;
type MetricKey = keyof typeof METRICS;

/** Mindestens so viele Spiele (für das jeweilige Team), um in eine Vergleichsgruppe aufgenommen zu werden. */
const POOL_MIN_GAMES = 3;

const METRICS_BY_GROUP: Record<string, MetricKey[]> = {
  QB: ['passing'], RB: ['rushing'], WR: ['receiving'], TE: ['receiving'], REC: ['receiving'],
  DL: ['passrush', 'tackling', 'coverage'], LB: ['tackling', 'passrush', 'coverage'],
  DB: ['coverage', 'tackling', 'passrush'], DEF: ['coverage', 'tackling', 'passrush'],
  OL: [],
};

interface Rank { value: number; perGame: number; rank: number; of: number; pct: number }

function rankAgainst(pool: { id: string; perGame: number }[], self: { id: string; perGame: number }): Rank | null {
  const others = pool.filter((x) => x.id !== self.id);
  const all = [...others, self];
  if (all.length < 5) return null; // zu kleine Gruppe – keine Einordnung
  const below = others.filter((x) => x.perGame < self.perGame - 1e-9).length;
  const above = others.filter((x) => x.perGame > self.perGame + 1e-9).length;
  return {
    value: 0,
    perGame: round(self.perGame),
    rank: above + 1,
    of: all.length,
    pct: Math.round((below / (all.length - 1)) * 100),
  };
}

// ─────────────────────────────────────────────────────────── Export je Saison

const roleOfIn = (season: number) => (id: string) => {
  const p = playerById.get(id);
  if (!p || p.shared) return null; // Sammeleinträge zweier Spieler nie in eine Aufstellung
  return p.seasons.find((s) => s.season === season)?.role ?? null;
};

function cityOf(t: WebTeam) {
  if (t.short && t.name.endsWith(` ${t.short}`)) return t.name.slice(0, -t.short.length - 1);
  return t.name;
}

function exportLogo(t: WebTeam): string | null {
  // Die Logos liegen bereits in der Website (web/public/logos) – kein zweites Exemplar, nur der Pfad.
  if (!t.logo) return null;
  return existsSync(join(WEB_PUBLIC, t.logo)) ? t.logo.replace(/^\//, '') : null;
}

/**
 * Spielerfoto für die Spotlight-Karte, falls vorhanden: web/public/trapview/photos/<spieler-id>.(webp|jpg|png).
 * Fehlt es, zeigt die Karte die stilisierte Silhouette. Ein Foto ergänzen = Datei ablegen, `npm run data:trapview`.
 */
const PHOTO_DIR = join(WEB_PUBLIC, 'trapview', 'photos');
function photoOf(id: string): string | null {
  for (const ext of ['webp', 'jpg', 'png']) {
    if (existsSync(join(PHOTO_DIR, `${id}.${ext}`))) return `photos/${id}.${ext}`;
  }
  return null;
}

const out = {
  generatedAt: new Date().toISOString(),
  source: {
    note: 'GFL-Statistikbögen (statsnscore.online / presto) aus gflstats.db, aufbereitet durch scripts/build_data.py',
    builtAt: meta.builtAt,
    database: meta.source?.database ?? 'gflstats.db',
    databaseSha256: meta.source?.databaseSha256 ?? null,
  },
  currentSeason: meta.currentSeason,
  method: {
    minGameShare: MIN_GAME_SHARE,
    regularGameShare: REGULAR_GAME_SHARE,
    poolMinGames: POOL_MIN_GAMES,
    slots: Object.fromEntries(SLOTS.map((s) => [s.position, { basis: s.basis, min: s.minLabel }])),
    provisionalSlots: Object.fromEntries(PROVISIONAL_SLOTS.map((s) => [s.position, { basis: s.basis, min: s.minLabel }])),
    metrics: Object.fromEntries(Object.entries(METRICS).map(([k, m]) => [k, { label: m.label, peers: m.peers }])),
    spotlight: describeMethod(),
  },
  fields: Object.fromEntries(fields.filter((f) => KEEP.includes(f.key)).map((f) => [f.key, { label: f.label, abbr: f.abbr }])),
  seasons: [] as unknown[],
};

const logoCache = new Map<string, string | null>();

for (const season of [...meta.seasons].sort((a, b) => b - a)) {
  const rows = read<PgRow[]>(join(WEB_DATA, 'pg', `${season}.json`));
  const roleOf = roleOfIn(season);
  const available = Object.entries(meta.availability).filter(([, s]) => s.includes(season)).map(([k]) => k).filter((k) => KEEP.includes(k));

  // Saisonwerte je Spieler und Team (+ je Gegner)
  const byPT = new Map<string, { id: string; team: string; games: Set<string>; stats: Stats; vs: Map<string, { games: Set<string>; stats: Stats }> }>();
  for (const r of rows) {
    const key = `${r.p}|${r.t}`;
    let e = byPT.get(key);
    if (!e) byPT.set(key, (e = { id: r.p, team: r.t, games: new Set(), stats: {}, vs: new Map() }));
    e.games.add(r.g);
    addStats(e.stats, r.s);
    const g = gameById.get(r.g);
    const opp = g ? (g.home === r.t ? g.away : g.home) : null;
    if (opp) {
      let o = e.vs.get(opp);
      if (!o) e.vs.set(opp, (o = { games: new Set(), stats: {} }));
      o.games.add(r.g);
      addStats(o.stats, r.s);
    }
  }

  // Vergleichsgruppen je Kennzahl
  const pools = new Map<MetricKey, { id: string; perGame: number }[]>();
  for (const [key, m] of Object.entries(METRICS) as [MetricKey, (typeof METRICS)[MetricKey]][]) {
    const pool: { id: string; perGame: number }[] = [];
    for (const e of byPT.values()) {
      if (e.games.size < POOL_MIN_GAMES || roleOf(e.id) !== m.role || !m.inPool(e.stats)) continue;
      pool.push({ id: `${e.id}|${e.team}`, perGame: m.value(e.stats) / e.games.size });
    }
    pools.set(key, pool);
  }

  // Player Spotlight: Vergleichsgruppen der ganzen Liga (nur diese Saison), Auswahl je Team weiter unten
  const spotlightPools = buildPools(
    [...byPT.values()].map((e) => ({ id: e.id, team: e.team, role: roleOf(e.id), games: e.games.size, stats: e.stats })),
    Object.entries(meta.availability).filter(([, s]) => s.includes(season)).map(([k]) => k),
  );

  const seasonTeams = [...new Set(rows.map((r) => r.t))]
    .map((id) => teams.find((t) => t.id === id))
    .filter((t): t is WebTeam => !!t)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const teamOut = [];
  for (const t of seasonTeams) {
    const roster = rosters[String(season)]?.[t.id];
    const lineup: Lineup | null = roster
      ? startingLineup(rows, t.id, roster, MAX_FIELDS)
      : provisionalLineup(rows, t.id, roleOf, MAX_FIELDS);
    if (!lineup) continue;

    const playerOut = (lp: LineupPlayer) => {
      if (!lp.player) return { group: lp.position, spot: lp.spot, player: null };
      const wp = playerById.get(lp.player);
      const e = byPT.get(`${lp.player}|${t.id}`);
      const games = e?.games.size ?? lp.games;
      const ranks: Partial<Record<MetricKey, Rank>> = {};
      for (const mk of METRICS_BY_GROUP[lp.position] ?? []) {
        const m = METRICS[mk];
        const stats = e?.stats ?? lp.stats;
        if (!games) continue;
        const r = rankAgainst(pools.get(mk)!, { id: `${lp.player}|${t.id}`, perGame: m.value(stats) / games });
        if (r) ranks[mk] = { ...r, value: round(m.value(stats)) };
      }
      const vs: Record<string, { games: number; stats: Stats }> = {};
      for (const [opp, o] of e?.vs ?? []) vs[opp] = { games: o.games.size, stats: pick(o.stats) };
      return {
        group: lp.position,
        spot: lp.spot,
        player: {
          id: lp.player,
          // Name aus der bereinigten Spielerliste der Website (gleiche ID wie im Statistikbogen)
          name: wp?.name ?? lp.rosterName ?? lp.player,
          // Rückennummer nur aus dem offiziellen Kader – sonst null, nie geschätzt
          number: lp.number ?? null,
          games,
          volume: lp.volume ?? null,
          score: lp.score,
          stats: pick(e?.stats ?? lp.stats),
          ranks,
          vs,
        },
      };
    };

    if (!logoCache.has(t.id)) logoCache.set(t.id, exportLogo(t));
    const colors = t.colors?.primary
      ? { primary: t.colors.primary, secondary: t.colors.secondary ?? t.colors.primary, source: t.colors.source ?? null }
      : null;

    // Bis zu drei herausragende Spieler je Seite, nur aus der Starting Lineup (sie stehen auf dem Feld)
    const spotlightOf = (entries: LineupPlayer[]): SpotlightPick[] =>
      pickSpotlight(spotlightPools, t.id, entries.flatMap((lp) => (lp.player ? [{ id: lp.player, group: lp.position }] : [])))
        .map((pick) => ({ ...pick, photo: photoOf(pick.id) }));

    teamOut.push({
      id: t.id,
      name: t.name,
      city: cityOf(t),
      nickname: t.short ?? t.name,
      abbreviation: t.abbr,
      colors,
      logo: logoCache.get(t.id) ?? null,
      // Alle Spieler mit Einsatz für das Team in dieser Saison – nur, um gleiche Nachnamen zu erkennen
      squad: [...byPT.values()].filter((e) => e.team === t.id).map((e) => playerById.get(e.id)?.name ?? e.id).sort(),
      lineup: {
        basis: lineup.basis,
        rosterSource: roster?.source ?? null,
        teamGames: lineup.teamGames,
        minGames: lineup.minGames,
        flex: lineup.flex,
        offense: lineup.offense.map(playerOut),
        defense: lineup.defense.map(playerOut),
      },
      spotlight: {
        offense: spotlightOf(lineup.offense),
        defense: spotlightOf(lineup.defense),
      },
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `season-${season}.json`), JSON.stringify({ season, available, teams: teamOut }));
  out.seasons.push({ season, teams: teamOut.length, withRoster: teamOut.filter((x) => x.lineup.basis === 'roster').length });
}

writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(out));

const summary = (out.seasons as { season: number; teams: number; withRoster: number }[])
  .map((s) => `${s.season}: ${s.teams} Teams (${s.withRoster} mit Kader)`)
  .join(' · ');
console.log(`Trap View: Daten geschrieben → web/public/trapview/data/  [${summary}]`);

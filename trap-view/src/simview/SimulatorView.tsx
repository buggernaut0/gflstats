import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildProfiles, randomSeed, simulateGame, type Profiles } from '../sim/index.ts';
import { MultiPanel } from './MultiPanel';
import { SimMethod } from './SimMethod';
import type { GameResult, PlayEvent, SimData } from '../sim/types';
import { loadSeason } from '../data/load';
import type { SeasonData, Team } from '../data/types';
import { buildUnits } from './roster';
import { FieldCanvas, type Pos, type TeamLook } from './FieldCanvas';
import { absOf, clockLabel, eventDuration, motionEnd, ordinal, spotLabel, type Speed } from './playback';
import '../ui/styles.css';
import './sim.css';

/** Der Simulator bezieht sich ausschließlich auf diese Saison. */
export const SIM_SEASON = 2026;

const base = () => import.meta.env.BASE_URL.replace(/\/$/, '');

// ─────────────────────────────────────────────────────────── Farben

function rgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lum = (hex: string) => { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const dist = (a: string, b: string) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const inkFor = (fill: string) => (lum(fill) > 0.55 ? '#0b0d10' : '#ffffff');

/** Belegte Teamfarben, sonst neutral hell/dunkel – und immer klar unterscheidbar. */
function teamLooks(a: Team, b: Team): [TeamLook, TeamLook] {
  const fa = a.colorsVerified ? a.colors.primary : '#d9dde3';
  let fb = b.colorsVerified ? b.colors.primary : '#55606f';
  if (dist(fa, fb) < 110) fb = lum(fa) > 0.5 ? '#1c2129' : '#f1f2f0';
  return [
    { id: a.id, abbr: a.abbreviation, fill: fa, ink: inkFor(fa) },
    { id: b.id, abbr: b.abbreviation, fill: fb, ink: inkFor(fb) },
  ];
}

// ─────────────────────────────────────────────────────────── Hilfen

const isScrimmage = (e: PlayEvent) => e.down > 0 && e.type !== 'kickoff' && e.type !== 'pat' && e.type !== 'twopoint';

function driveStarts(events: PlayEvent[], home: string): (number | null)[] {
  const out: (number | null)[] = [];
  let start: number | null = null;
  let prev: PlayEvent | null = null;
  for (const e of events) {
    if (!isScrimmage(e)) { out.push(null); start = null; prev = e; continue; }
    if (start == null || !prev || prev.offense !== e.offense || prev.turnover || !isScrimmage(prev)) start = absOf(e, home, e.yardLine);
    out.push(start);
    prev = e;
  }
  return out;
}

const pct = (p: number) => `${Math.round(p * 100)} %`;

function chanceTone(label: string) {
  if (/Reception|gelingt|Extra Point|Field Goal|ausspielen|erwartet/.test(label)) return 'good';
  if (/Interception|Sack|Fumble|Return-Touchdown/.test(label)) return 'bad';
  if (/Incomplete|Drop|Raumverlust|Strafe|ohne Anspielstation/.test(label)) return 'warn';
  return 'neutral';
}

// ─────────────────────────────────────────────────────────── Ansicht

interface Props {
  initialTeams?: [string, string];
  /** true = mit initialTeams sofort simulieren (Einstieg aus der Trap View, keine Zwischenseite) */
  autoStart?: boolean;
  onBack?: () => void;
}

export function SimulatorView({ initialTeams, autoStart = false, onBack }: Props) {
  const [data, setData] = useState<SimData | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<[string, string] | null>(initialTeams ?? null);
  const [game, setGame] = useState<GameResult | null>(null);
  const [method, setMethod] = useState(false);
  const closeMethod = useCallback(() => setMethod(false), []);

  useEffect(() => {
    Promise.all([
      fetch(`${base()}/data/sim-${SIM_SEASON}.json`).then((r) => { if (!r.ok) throw new Error(`sim-${SIM_SEASON}.json: HTTP ${r.status}`); return r.json() as Promise<SimData>; }),
      loadSeason(SIM_SEASON),
    ])
      .then(([d, s]) => {
        setData(d);
        setSeason(s);
        const ids = new Set(d.teams.map((t) => t.id));
        const list = s.teams.filter((t) => ids.has(t.id));
        setTeams(list);
        setPick((p) => (p && ids.has(p[0]) && ids.has(p[1]) && p[0] !== p[1] ? p : [list[0].id, list[1].id]));
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const profiles = useMemo(() => (data ? buildProfiles(data) : null), [data]);

  const start = useCallback((seed = randomSeed()) => {
    if (!profiles || !pick) return;
    setGame(simulateGame(profiles, { seed, home: pick[0], away: pick[1] }));
  }, [profiles, pick]);

  // Einstieg aus der Trap View: genau die dort gewählten Teams, sofort losspielen
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStarted.current || !profiles || !pick || !initialTeams) return;
    if (pick[0] !== initialTeams[0] || pick[1] !== initialTeams[1]) return; // Teams nicht in den Daten 2026 → Auswahl zeigen
    autoStarted.current = true;
    start();
  }, [autoStart, profiles, pick, initialTeams, start]);

  if (error) {
    return (
      <div className="tv-root sim"><div className="tv-boot">
        <b>Simulator-Daten fehlen.</b><span>{error}</span><span>Im Ordner trap-view <code>npm run data</code> ausführen.</span>
      </div></div>
    );
  }
  if (!data || !teams || !pick || !season) return <div className="tv-root sim"><div className="tv-boot"><span>Lade Saison {SIM_SEASON} …</span></div></div>;

  const teamA = teams.find((t) => t.id === pick[0])!;
  const teamB = teams.find((t) => t.id === pick[1])!;

  if (!game) {
    return (
      <div className="tv-root sim">
        <header className="sim-head">
          {onBack && <button className="sim-link" onClick={onBack}>← Trap View</button>}
          <span className="tv-wordmark">GFL SIMULATOR</span>
          <button className="sim-link sim-head__method" onClick={() => setMethod(true)}>So funktioniert's</button>
          <span className="sim-head__sub">Saison {SIM_SEASON} · vollautomatisch</span>
        </header>
        <div className="sim-pick">
          {[0, 1].map((side) => (
            <section key={side} className="sim-pick__side">
              <h2>{side === 0 ? 'Team 1' : 'Team 2'}</h2>
              <div className="sim-pick__name">{(side === 0 ? teamA : teamB).name}</div>
              <div className="sim-pick__chips">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    className={`tv-chip${pick[side] === t.id ? ' is-active' : ''}`}
                    disabled={pick[1 - side] === t.id}
                    onClick={() => setPick(side === 0 ? [t.id, pick[1]] : [pick[0], t.id])}
                    title={t.name}
                  >{t.abbreviation}</button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <footer className="sim-pick__foot">
          <button className="tv-enter" onClick={() => start()}><span>SIMULATION STARTEN</span></button>
          <p className="sim-note">
            Beide Teams spielen ein komplettes Spiel (4 × 12 Minuten). Jeder Spielzug wird aus den echten Werten
            der Saison {SIM_SEASON} berechnet und per Zufall entschieden – keine Eingriffe, kein Playcalling.
            Kein Heimvorteil, keine Overtime.
          </p>
        </footer>
        {profiles && (
          <div className="sim-multi-wrap">
            <MultiPanel
              profiles={profiles}
              teams={(() => { const [x, y] = teamLooks(teamA, teamB); return [{ ...x, name: teamA.name }, { ...y, name: teamB.name }]; })()}
            />
          </div>
        )}
        {method && <SimMethod data={data} onClose={closeMethod} />}
      </div>
    );
  }

  return (
    <>
    {method && <SimMethod data={data} onClose={closeMethod} />}
    <GamePlayer
      key={game.seed}
      data={data}
      season={season}
      game={game}
      teamA={teamA}
      teamB={teamB}
      onNew={() => start()}
      onTeams={() => setGame(null)}
      onBack={onBack}
      profiles={profiles!}
      onMethod={() => setMethod(true)}
    />
    </>
  );
}

// ─────────────────────────────────────────────────────────── Wiedergabe

function GamePlayer({ data, season, game, teamA, teamB, onNew, onTeams, onBack, profiles, onMethod }: {
  data: SimData; season: SeasonData; game: GameResult; teamA: Team; teamB: Team;
  onNew: () => void; onTeams: () => void; onBack?: () => void; profiles: Profiles; onMethod: () => void;
}) {
  const events = game.events;
  const [home, away] = useMemo(() => teamLooks(teamA, teamB), [teamA, teamB]);
  const look = (id: string) => (id === home.id ? home : away);
  const teamOf = (id: string) => (id === teamA.id ? teamA : teamB);

  const names = useMemo(() => {
    const m = new Map<string, { name: string; number: number | null }>();
    for (const t of data.teams) if (t.id === home.id || t.id === away.id) for (const p of t.players) m.set(`${t.id}|${p.id}`, { name: p.name, number: p.number });
    return m;
  }, [data, home.id, away.id]);
  const drives = useMemo(() => driveStarts(events, home.id), [events, home.id]);
  const units = useMemo(() => buildUnits(season, teamA.id, teamB.id), [season, teamA.id, teamB.id]);
  const totalMs = useMemo(() => events.reduce((x, e) => x + eventDuration(e, 1), 0), [events]);

  const pos = useRef<Pos>({ index: 0, t: 0 });
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  const [selected, setSelected] = useState<number | null>(null);
  const finished = revealed >= events.length - 1;
  const ctl = useRef({ playing, speed });
  ctl.current = { playing, speed };

  /** Wiederholung eines einzelnen Spielzugs: danach geht es an der alten Stelle weiter. */
  const rewatch = useRef<{ resume: Pos } | null>(null);
  const [rewatching, setRewatching] = useState<number | null>(null);

  const onFrame = useCallback((dt: number) => {
    const { playing, speed } = ctl.current;
    const rw = rewatch.current;
    if (!playing && !rw) return;
    const p = pos.current;
    const e = events[p.index];
    const before = p.t;
    p.t += dt / eventDuration(e, rw ? 1 : speed); // Wiederholung immer in Normaltempo
    if (rw) {
      if (p.t >= 1) {
        pos.current = { ...rw.resume };
        rewatch.current = null;
        setRewatching(null);
        setCursor(rw.resume.index);
      }
      return;
    }
    if (before < motionEnd(e) && p.t >= motionEnd(e)) setRevealed((r) => Math.max(r, p.index));
    if (p.t >= 1) {
      if (p.index < events.length - 1) {
        p.index++;
        p.t = 0;
        setCursor(p.index);
      } else {
        p.t = 1;
        setRevealed(events.length - 1);
        setPlaying(false);
      }
    }
  }, [events]);

  const watchAgain = (i: number) => {
    rewatch.current = { resume: { ...(rewatch.current?.resume ?? pos.current) } };
    pos.current = { index: i, t: 0 };
    setCursor(i);
    setRewatching(i);
  };

  const jumpToEnd = () => {
    pos.current = { index: events.length - 1, t: 1 };
    setCursor(events.length - 1);
    setRevealed(events.length - 1);
    setPlaying(false);
  };
  const replay = () => {
    pos.current = { index: 0, t: 0 };
    setCursor(0);
    setRevealed(-1);
    setSelected(null);
    setPlaying(true);
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code === 'Space' && !(ev.target instanceof HTMLButtonElement)) { ev.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const e = events[cursor];
  const score = revealed >= 0 ? events[revealed].score : { [home.id]: 0, [away.id]: 0 };
  const shown = selected ?? (revealed >= 0 ? revealed : null);
  const why = shown != null ? events[shown] : null;
  const ticker = events.slice(0, revealed + 1).reverse();

  return (
    <div className="tv-root sim">
      <header className="sim-head">
        {onBack && <button className="sim-link" onClick={onBack}>← Trap View</button>}
        <span className="tv-wordmark tv-wordmark--sm">GFL SIMULATOR</span>
        <button className="sim-link sim-head__method" onClick={onMethod}>So funktioniert's</button>
        <span className="sim-head__sub">Saison {SIM_SEASON} · Seed {game.seed}</span>
      </header>

      <div className="sim-board">
        {[home, away].map((t, i) => (
          <div key={t.id} className={`sim-board__team sim-board__team--${i ? 'away' : 'home'}`} style={{ '--fill': t.fill, '--ink': t.ink } as React.CSSProperties}>
            {teamOf(t.id).logo && <img src={teamOf(t.id).logo!} alt="" />}
            <span className="sim-board__name">{teamOf(t.id).city}<small>{teamOf(t.id).nickname}</small></span>
            {e.offense === t.id && isScrimmage(e) && !finished && <span className="sim-board__ball" title="Ballbesitz" />}
            <span className="sim-board__score">{score[t.id] ?? 0}</span>
          </div>
        ))}
        <div className="sim-board__state">
          {finished && rewatching == null ? <b>FINAL</b> : <>
            <b>{rewatching != null && <em className="sim-replay">Wiederholung</em>}Q{e.quarter} · {clockLabel(e.clock)}</b>
            <span>
              {isScrimmage(e) ? `${ordinal(e.down)} & ${e.yardLine + e.distance >= 100 ? 'Goal' : e.distance} · ${spotLabel(e.yardLine, look(e.offense).abbr, look(e.defense).abbr)}` : e.type === 'kickoff' ? 'Kickoff' : e.type === 'pat' || e.type === 'twopoint' ? 'Extrapunkt' : ''}
            </span>
          </>}
        </div>
      </div>

      <main className="sim-main">
        <section className="sim-stage">
          {finished && <Summary game={game} home={home} away={away} teamOf={teamOf} onReplay={replay} onNew={onNew} />}
          <div className="sim-field-wrap">
            <FieldCanvas events={events} home={home} away={away} names={names} units={units} pos={pos} driveStart={drives} onFrame={onFrame} />
          </div>
          <div className="sim-controls">
            <button className="tv-chip" onClick={() => (finished ? replay() : setPlaying((p) => !p))}>{finished ? '↺ Nochmal ansehen' : playing ? '❚❚ Pause' : '▶ Weiter'}</button>
            <div className="sim-speeds" role="group" aria-label="Tempo">
              {([1, 2, 4, 'highlights'] as Speed[]).map((s) => (
                <button key={String(s)} className={`tv-chip${speed === s ? ' is-active' : ''}`} onClick={() => setSpeed(s)}>
                  {s === 'highlights' ? 'Highlights' : `${s}×`}
                </button>
              ))}
            </div>
            <button className="tv-chip" onClick={jumpToEnd} disabled={finished}>Zum Ende ⏭</button>
            <span className="sim-controls__spacer" />
            <button className="tv-chip" onClick={onNew}>Neues Spiel</button>
            <button className="tv-chip" onClick={onTeams}>Teams wechseln</button>
            <span className="sim-controls__hint">Spieldauer bei 1× ≈ {Math.floor(totalMs / 60000)}:{String(Math.round((totalMs % 60000) / 1000)).padStart(2, '0')} min · Leertaste = Pause</span>
          </div>
        </section>

        <aside className="sim-side">
          <section className="sim-why">
            <h3>{why ? (selected != null ? 'Ausgewählter Spielzug' : 'Letzter Spielzug') : 'Warum passiert was?'}</h3>
            {why ? <Why e={why} offAbbr={look(why.offense).abbr} onWatch={() => watchAgain(why.index)} watching={rewatching === why.index} /> : (
              <p className="sim-muted">Zu jedem Spielzug stehen hier die berechneten Wahrscheinlichkeiten und woraus sie entstehen. Entschieden wird danach per Zufall.</p>
            )}
            {selected != null && <button className="sim-link" onClick={() => setSelected(null)}>Zurück zum aktuellen Spielzug</button>}
          </section>
          <section className="sim-ticker">
            <h3>Spielverlauf</h3>
            <ol>
              {ticker.map((x) => (
                <li
                  key={x.index}
                  className={`${x.key ? 'is-key' : ''}${x.points ? ' is-score' : ''}${selected === x.index ? ' is-selected' : ''}`}
                  style={{ '--fill': look(x.points?.team ?? x.offense).fill } as React.CSSProperties}
                >
                  <button onClick={() => setSelected(x.index)}>
                    <span className="sim-ticker__meta">Q{x.quarter} {clockLabel(x.clock)}{isScrimmage(x) ? ` · ${ordinal(x.down)}&${x.distance}` : ''} · {look(x.offense).abbr}</span>
                    <span className="sim-ticker__text">{x.text}</span>
                    {x.points && <span className="sim-ticker__score">{look(home.id).abbr} {x.score[home.id]} : {x.score[away.id]} {look(away.id).abbr}</span>}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </main>
      <div className="sim-multi-wrap">
        <MultiPanel profiles={profiles} teams={[{ ...home, name: teamA.name }, { ...away, name: teamB.name }]} />
      </div>
      <footer className="sim-foot">
        Grundlage: GFL-Statistikbögen {SIM_SEASON} ({data.league.games} Spiele). Spielerwerte zum Ligaschnitt geglättet, direkte Duelle nur auf
        Teamebene (die Bögen sagen nicht, wer wen gedeckt hat). Annahmen wie Yard-Verteilung, Uhr und 4th-Down-Situationen sind
        Simulationsparameter, keine Spielerstatistiken. Quelle: {data.source}.
      </footer>
    </div>
  );
}

function Why({ e, offAbbr, onWatch, watching }: { e: PlayEvent; offAbbr: string; onWatch: () => void; watching: boolean }) {
  return (
    <div className="sim-why__body">
      <div className="sim-why__text">{e.text}</div>
      <button className="tv-chip sim-watch" onClick={onWatch} disabled={watching}>{watching ? 'Wird gezeigt …' : '▶ Spielzug nochmal zeigen'}</button>
      {e.passRate != null && <div className="sim-muted">Spielzugwahl {offAbbr}: Pass {pct(e.passRate)} · Lauf {pct(1 - e.passRate)} (Teamquote 2026, nach Situation angepasst)</div>}
      {e.chances.length === 0 && <div className="sim-muted">Keine Zufallsentscheidung bei diesem Ereignis.</div>}
      {e.chances.map((c, i) => (
        <div key={i} className={`sim-chance sim-chance--${chanceTone(c.label)}`}>
          <div className="sim-chance__row"><span>{c.label}</span><b>{pct(c.p)}</b></div>
          <div className="sim-chance__bar"><i style={{ width: `${Math.max(1, c.p * 100)}%` }} /></div>
          {c.basis && <div className="sim-chance__basis">{c.basis}</div>}
        </div>
      ))}
      {e.expectedYards != null && <div className="sim-muted">Erwarteter Raumgewinn vor dem Zufall: {e.expectedYards.toFixed(1)} Yards · tatsächlich: {e.yards} Yards</div>}
    </div>
  );
}

function Summary({ game, home, away, teamOf, onReplay, onNew }: {
  game: GameResult; home: TeamLook; away: TeamLook; teamOf: (id: string) => Team; onReplay: () => void; onNew: () => void;
}) {
  const rows: [string, (s: GameResult['team'][string]) => string][] = [
    ['Spielzüge', (s) => String(s.plays)],
    ['First Downs', (s) => String(s.firstDowns)],
    ['Pass-Yards', (s) => String(s.passYds)],
    ['Lauf-Yards', (s) => String(s.rushYds)],
    ['Sacks erlitten', (s) => String(s.sacks)],
    ['Turnovers', (s) => String(s.turnovers)],
    ['Punts', (s) => String(s.punts)],
  ];
  const leaders = (team: string) => {
    const lines = Object.values(game.box).filter((b) => b.team === team);
    const top = <K extends keyof (typeof lines)[number]>(k: K) => [...lines].sort((a, b) => (b[k] as number) - (a[k] as number))[0];
    const p = top('passingyards'), r = top('runyards'), c = top('receivingyards'), d = top('tackles');
    return [
      p && p.pass > 0 ? `${p.name}: ${p.complete}/${p.pass}, ${p.passingyards} Yds, ${p.touchdownpass} TD, ${p.interception} INT` : null,
      r && r.run > 0 ? `${r.name}: ${r.run} Läufe, ${r.runyards} Yds, ${r.touchdownrun} TD` : null,
      c && c.catched > 0 ? `${c.name}: ${c.catched} Rec, ${c.receivingyards} Yds, ${c.touchdowncatch} TD` : null,
      d && d.tackles > 0 ? `${d.name}: ${d.tackles} Tackles${d.sacks ? `, ${d.sacks} Sacks` : ''}` : null,
    ].filter(Boolean) as string[];
  };
  return (
    <div className="sim-summary">
      <div className="sim-summary__score">
        <span style={{ borderColor: home.fill }}>{teamOf(home.id).nickname}</span>
        <b>{game.score[home.id]} : {game.score[away.id]}</b>
        <span style={{ borderColor: away.fill }}>{teamOf(away.id).nickname}</span>
      </div>
      <table>
        <thead><tr><th>{home.abbr}</th><th /><th>{away.abbr}</th></tr></thead>
        <tbody>{rows.map(([label, f]) => <tr key={label}><td>{f(game.team[home.id])}</td><th>{label}</th><td>{f(game.team[away.id])}</td></tr>)}</tbody>
      </table>
      <div className="sim-summary__leaders">
        {[home, away].map((t) => (
          <div key={t.id}><h4>{t.abbr}</h4>{leaders(t.id).map((l) => <p key={l}>{l}</p>)}</div>
        ))}
      </div>
      <div className="sim-summary__actions">
        <button className="tv-chip" onClick={onReplay}>↺ Nochmal ansehen</button>
        <button className="tv-chip is-active" onClick={onNew}>Neues Spiel simulieren</button>
      </div>
    </div>
  );
}

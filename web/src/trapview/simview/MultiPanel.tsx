import { useEffect, useRef, useState } from 'react';
import { MultiSim, randomSeed, type MultiResult, type PlayerAvg, type Profiles } from '../sim/index.ts';
import type { TeamLook } from './FieldCanvas';
import { useI18n, type I18n } from '../../i18n/react';

const RUNS = 1000;
const CHUNK = 50;

const pctOf = (f: I18n) => (x: number) => (f.lang === 'en' ? `${Math.round(x * 100)}%` : `${Math.round(x * 100)} %`);

/**
 * Siegchance über 1.000 Simulationen. Läuft in Häppchen (je 50 Spiele per setTimeout – läuft auch
 * in einem Hintergrund-Tab weiter), damit die Seite
 * bedienbar bleibt. Ergebnis: Siegquote, Punkte, Verteilung der Differenz, häufigste Spielstände,
 * Durchschnittswerte der wichtigsten Spieler.
 */
export function MultiPanel({ profiles, teams, names, autoRun = false }: {
  profiles: Profiles;
  teams: [TeamLook & { name: string }, TeamLook & { name: string }];
  /** Anzeigename je Team-ID */
  names?: Record<string, string>;
  autoRun?: boolean;
}) {
  const [a, b] = teams;
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<MultiResult | null>(null);
  const [running, setRunning] = useState(false);
  const timer = useRef(0);
  const f = useI18n();
  const su = f.m.simui;

  const start = () => {
    window.clearTimeout(timer.current);
    const sim = new MultiSim(profiles, a.id, b.id, randomSeed());
    setResult(null);
    setDone(0);
    setRunning(true);
    let total = 0;
    const step = () => {
      const n = (total = sim.run(Math.min(CHUNK, RUNS - total)));
      setDone(n);
      if (n < RUNS) timer.current = window.setTimeout(step, 0);
      else { setResult(sim.result()); setRunning(false); }
    };
    timer.current = window.setTimeout(step, 0);
  };

  useEffect(() => {
    if (autoRun) start();
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.id, b.id]);

  const label = (id: string) => names?.[id] ?? (id === a.id ? a.name : b.name);

  return (
    <section className="sim-multi">
      <header className="sim-multi__head">
        <h3>{su.multiTitle(f.fmt(RUNS))}</h3>
        <button className="tv-chip" onClick={start} disabled={running}>
          {running ? su.simulating(f.fmt(done)) : result ? su.recalc : su.simulateN(f.fmt(RUNS))}
        </button>
      </header>
      {running && <div className="sim-multi__progress"><i style={{ width: `${(done / RUNS) * 100}%` }} /></div>}
      {!result && !running && (
        <p className="sim-muted">{su.multiIntro(f.fmt(RUNS))}</p>
      )}
      {result && <Result r={result} a={a} b={b} label={label} />}
    </section>
  );
}

function Result({ r, a, b, label }: { r: MultiResult; a: TeamLook; b: TeamLook; label: (id: string) => string }) {
  const f = useI18n();
  const su = f.m.simui;
  const pct = pctOf(f);
  const nf = (x: number) => f.fmtDec(x, 1);
  const n = r.runs;
  const wa = r.wins[a.id] / n, wb = r.wins[b.id] / n, t = r.ties / n;
  const maxMargin = Math.max(...r.margins.map((m) => m.count), 1);
  const marginLabel = (m: MultiResult['margins'][number]) => {
    if (m.from === -Infinity) return `${b.abbr} +22`;
    if (m.to === Infinity) return `${a.abbr} +22`;
    if (m.from === 0 && m.to === 0) return su.tie;
    return m.to < 0 ? `${b.abbr} +${-m.to}–${-m.from}` : `${a.abbr} +${m.from}–${m.to}`;
  };
  return (
    <div className="sim-multi__body">
      <div className="sim-multi__odds">
        <div className="sim-multi__bar" role="img" aria-label={su.oddsAria(label(a.id), pct(wa), pct(t), label(b.id), pct(wb))}>
          <i style={{ width: `${wa * 100}%`, background: a.fill }} />
          <i style={{ width: `${t * 100}%`, background: '#8a94a3' }} />
          <i style={{ width: `${wb * 100}%`, background: b.fill }} />
        </div>
        <div className="sim-multi__legend">
          <span><b>{pct(wa)}</b>{su.wins(label(a.id), nf(r.avgPoints[a.id]))}</span>
          {r.ties > 0 && <span><b>{pct(t)}</b> {su.tie}</span>}
          <span><b>{pct(wb)}</b>{su.wins(label(b.id), nf(r.avgPoints[b.id]))}</span>
        </div>
      </div>

      <div className="sim-multi__grid">
        <div>
          <h4>{su.margin}</h4>
          <div className="sim-hist">
            {r.margins.map((m, i) => (
              <div key={i} className="sim-hist__row">
                <span>{marginLabel(m)}</span>
                <i style={{ width: `${(m.count / maxMargin) * 100}%`, background: m.from >= 1 ? a.fill : m.to <= -1 ? b.fill : '#8a94a3' }} />
                <em>{pct(m.count / n)}</em>
              </div>
            ))}
          </div>
          <p className="sim-muted">{su.close(pct(r.close))}</p>
        </div>
        <div>
          <h4>{su.topScores}</h4>
          <ol className="sim-scores">
            {r.topScores.map((s) => <li key={s.score}><b>{s.score.replace(':', ' : ')}</b> <span>{pct(s.count / n)}</span></li>)}
          </ol>
          <p className="sim-muted">{su.scoresNote(a.abbr, b.abbr)}</p>
        </div>
      </div>

      <div className="sim-multi__grid">
        {[a, b].map((t) => <Leaders key={t.id} players={r.players.filter((p) => p.team === t.id)} team={t} label={label(t.id)} />)}
      </div>
      <p className="sim-muted">{su.multiFoot}</p>
    </div>
  );
}

function Leaders({ players, team, label }: { players: PlayerAvg[]; team: TeamLook; label: string }) {
  const f = useI18n();
  const su = f.m.simui;
  const nf = (x: number) => f.fmtDec(x, 1);
  const top = (k: keyof PlayerAvg, count: number) =>
    [...players].sort((x, y) => (y[k] as number) - (x[k] as number)).filter((p) => (p[k] as number) > 0).slice(0, count);
  const rows: [string, string][] = [
    ...top('passYds', 1).map((p): [string, string] => [p.name, su.avgPass(nf(p.passYds), nf(p.passTd), nf(p.int))]),
    ...top('rushYds', 2).map((p): [string, string] => [p.name, su.avgRun(nf(p.rushYds), nf(p.rushTd))]),
    ...top('recYds', 3).map((p): [string, string] => [p.name, su.avgRec(nf(p.rec), nf(p.recYds), nf(p.recTd))]),
    ...top('tackles', 2).map((p): [string, string] => [p.name, su.avgDef(nf(p.tackles), p.sacks >= 0.1 ? nf(p.sacks) : null)]),
  ];
  return (
    <div>
      <h4 style={{ borderColor: team.fill }} className="sim-multi__team">{su.perGameAvg(label)}</h4>
      <table className="sim-leaders">
        <tbody>{rows.map(([n, v], i) => <tr key={i}><th>{n}</th><td>{v}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

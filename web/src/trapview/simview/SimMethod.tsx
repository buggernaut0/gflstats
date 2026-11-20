import { useEffect, useMemo, useState } from 'react';
import { PARAMS, leagueModel } from '../sim/index.ts';
import { shrink } from '../sim/model.ts';
import type { SimData } from '../sim/types';
import { useI18n } from '../../i18n/react';

interface Backtest {
  games: number;
  runsPerGame: number;
  rows: { key: string; label: string; real: number; sim: number }[];
  winner: { hits: number; decided: number; brier: number };
  calibration: { from: number; games: number; predicted: number; actual: number }[];
}

import { ASSET_BASE } from '../paths';

const base = () => ASSET_BASE;

/** „So funktioniert die Simulation“ – alle Zahlen live aus Daten, Modell und Rücktest. */
export function SimMethod({ data, onClose }: { data: SimData; onClose: () => void }) {
  const L = useMemo(() => leagueModel(data), [data]);
  const [bt, setBt] = useState<Backtest | null>(null);
  const [btMissing, setBtMissing] = useState(false);

  useEffect(() => {
    fetch(`${base()}/data/sim-${data.season}-backtest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Backtest>) : Promise.reject(new Error(String(r.status)))))
      .then(setBt)
      .catch(() => setBtMissing(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data.season, onClose]);

  // Beispiel Shrinkage: Receiver mit 10 Targets, 8 Receptions
  const k = PARAMS.k.recCatch;
  const exSmall = shrink(8, 10, L.catchPerTarget, k);
  const exBig = shrink(80, 100, L.catchPerTarget, k);
  const B = PARAMS.breakaway;

  const f = useI18n();
  const t = f.m.simmethod;
  const nfL = (x: number, d = 1) => f.fmtDec(x, d);
  const pctL = (x: number, d = 0) => (f.lang === 'en' ? `${f.fmtDec(x * 100, d)}%` : `${f.fmtDec(x * 100, d)} %`);

  return (
    <div className="tv-root sim-method" role="dialog" aria-modal="true" aria-labelledby="sim-method-title">
      <div className="sim-method__panel">
        <header className="sim-method__head">
          <h2 id="sim-method-title">{t.title}</h2>
          <button className="tv-chip" onClick={onClose} autoFocus>{t.close}</button>
        </header>

        <section>
          <h3>{t.principle}</h3>
          <p><b>{t.principleBold}</b>{t.principleText(data.season)}</p>
        </section>

        <section>
          <h3>{t.data}</h3>
          <p>{t.dataText(data.season, data.league.games, data.teams.length, f.fmt(data.teams.reduce((x, tm) => x + tm.players.length, 0)))}</p>
          <div className="sim-method__cols">
            <div>
              <h4>{t.used}</h4>
              <ul>
                {t.usedItems.map(([b, txt]) => <li key={b}><b>{b}</b> {txt}</li>)}
              </ul>
            </div>
            <div>
              <h4>{t.missing}</h4>
              <ul>
                {t.missingItems.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          </div>
          <p className="sim-muted">{t.sackNote(nfL(data.league.sackYards))}</p>
        </section>

        <section>
          <h3>{t.compare}</h3>
          <p><b>{t.step1Bold}</b>{t.step1(pctL(L.catchPerTarget), k)}</p>
          <table className="sim-method__table">
            <thead><tr><th>{t.colReceiver}</th><th>{t.colRaw}</th><th>{t.colSim}</th></tr></thead>
            <tbody>
              <tr><td>{t.exSmall}</td><td>{pctL(0.8)}</td><td>{pctL(exSmall)}</td></tr>
              <tr><td>{t.exBig}</td><td>{pctL(0.8)}</td><td>{pctL(exBig)}</td></tr>
            </tbody>
          </table>
          <p><b>{t.step2Bold}</b>{t.step2(nfL(PARAMS.w.qbCmp))}</p>
          <p><b>{t.step3Bold}</b>{t.step3(PARAMS.h2h.kTargets, pctL(PARAMS.h2h.cap), Math.ceil((PARAMS.h2h.cap * PARAMS.h2h.kTargets) / (1 - PARAMS.h2h.cap)))}</p>
          <p className="sim-muted">
            {t.leagueLine(data.season, pctL(L.sack, 1), pctL(L.cmpPerAtt), pctL(L.intPerAtt, 1), nfL(L.ypc), nfL(L.ypcRun), pctL(L.fumblePerTouch, 1), pctL(L.fg), pctL(L.goRate4th))}
          </p>
        </section>

        <section>
          <h3>{t.params}</h3>
          <p>{t.paramsIntro}</p>
          <ul>
            <li><b>{t.pLengthBold}</b>{t.pLength(pctL(B.run.p), pctL(B.pass.p))}</li>
            <li><b>{t.pCallBold}</b>{t.pCall}</li>
            <li><b>{t.p4thBold}</b>{t.p4th}</li>
            <li><b>{t.pFgBold}</b>{t.pFg}</li>
            <li><b>{t.pClockBold}</b>{t.pClock(nfL(L.runningSeconds, 0))}</li>
            <li><b>{t.pNoBold}</b>{t.pNo}</li>
          </ul>
        </section>

        <section>
          <h3>{t.reality}</h3>
          {bt ? (
            <>
              <p>{t.backtest(bt.games, data.season, bt.runsPerGame)}</p>
              <table className="sim-method__table">
                <thead><tr><th>{t.colStat}</th><th>{t.colReal}</th><th>{t.colSimShort}</th><th>{t.colDev}</th></tr></thead>
                <tbody>
                  {bt.rows.map((r) => {
                    const dev = r.real ? (r.sim - r.real) / Math.abs(r.real) : 0;
                    return (
                      <tr key={r.key}>
                        <td>{t.rows[r.key] ?? r.label}</td><td>{nfL(r.real)}</td><td>{nfL(r.sim)}</td>
                        <td className={Math.abs(dev) > 0.1 ? 'is-off' : ''}>{dev >= 0 ? '+' : '−'}{pctL(Math.abs(dev))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p>{t.winnerA}<b>{t.winnerB(bt.winner.hits, bt.winner.decided)}</b>{t.winnerC(nfL(bt.winner.brier, 3), nfL(0.25, 3))}</p>
              <p className="sim-muted">{t.inSample}</p>
            </>
          ) : btMissing ? (
            <p className="sim-muted">{t.btMissing}</p>
          ) : <p className="sim-muted">{t.btLoading}</p>}
        </section>

        <section>
          <h3>{t.display}</h3>
          <p>{t.displayText}</p>
        </section>
      </div>
    </div>
  );
}

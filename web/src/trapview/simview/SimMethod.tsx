import { useEffect, useMemo, useState } from 'react';
import { PARAMS, leagueModel } from '../sim/index.ts';
import { shrink } from '../sim/model.ts';
import type { SimData } from '../sim/types';

interface Backtest {
  games: number;
  runsPerGame: number;
  rows: { key: string; label: string; real: number; sim: number }[];
  winner: { hits: number; decided: number; brier: number };
  calibration: { from: number; games: number; predicted: number; actual: number }[];
}

import { ASSET_BASE } from '../paths';

const base = () => ASSET_BASE;
const pct = (x: number, d = 0) => `${(x * 100).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const nf = (x: number, d = 1) => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

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

  return (
    <div className="tv-root sim-method" role="dialog" aria-modal="true" aria-labelledby="sim-method-title">
      <div className="sim-method__panel">
        <header className="sim-method__head">
          <h2 id="sim-method-title">So funktioniert die Simulation</h2>
          <button className="tv-chip" onClick={onClose} autoFocus>Schließen ✕</button>
        </header>

        <section>
          <h3>Das Prinzip</h3>
          <p>
            <b>Die Statistiken bestimmen die Ausgangswahrscheinlichkeiten, der Zufall entscheidet das einzelne Ereignis.</b>{' '}
            Für jeden Spielzug berechnet die Simulation aus den echten Werten der Saison {data.season}, wie wahrscheinlich
            Sack, Reception, Interception, Raumgewinn usw. sind – und würfelt dann. Starke Spieler haben dadurch auf Dauer
            bessere Ergebnisse, können aber jedes einzelne Duell verlieren. Kein Playcalling, keine Eingriffe.
          </p>
        </section>

        <section>
          <h3>Datengrundlage</h3>
          <p>
            Ausschließlich die GFL-Statistikbögen {data.season}: {data.league.games} Spiele, {data.teams.length} Teams,
            {' '}{data.teams.reduce((x, t) => x + t.players.length, 0).toLocaleString('de-DE')} Spieler-Einträge. Andere Saisons fließen nicht ein.
          </p>
          <div className="sim-method__cols">
            <div>
              <h4>Verwendet</h4>
              <ul>
                <li><b>Quarterback:</b> Passversuche, Completions, Yards, TD, Interceptions, Fumbles</li>
                <li><b>Receiver:</b> Targets (Receptions + nicht gefangene Zuspiele), Receptions, Yards, YAC, Drops, TD</li>
                <li><b>Läufer:</b> Läufe, Yards, Raumverluste, TD, Fumbles</li>
                <li><b>Defense:</b> Sacks, Tackles, Tackles for Loss, Interceptions, abgewehrte Pässe, Forced Fumbles</li>
                <li><b>Special Teams:</b> Field Goals (Versuche, Treffer, Weite), PAT, 2-Point, Punts, Kickoffs, Returns</li>
                <li><b>Team:</b> Pass-/Laufquote, Tempo, zugelassene Werte (aus den Bögen der Gegner), Strafen, 4th-Down-Versuche</li>
              </ul>
            </div>
            <div>
              <h4>Nicht in den Daten</h4>
              <ul>
                <li>Play-by-Play (Down, Distanz, Feldposition je Spielzug)</li>
                <li>Wer wen gedeckt hat – direkte Duelle gibt es nur auf Teamebene</li>
                <li>Leistungswerte der Offensive Line (sie wirkt über Team-Sacks und -Raumverluste)</li>
                <li>Länge einzelner Spielzüge (nur Summen und Längste)</li>
                <li>Physische Werte wie 40-Yard-Zeiten – werden nicht erfunden</li>
              </ul>
            </div>
          </div>
          <p className="sim-muted">
            Besonderheit der Bögen: Sacks sind als Läufe des Quarterbacks verbucht. Die Sack-Yards ({nf(data.league.sackYards)} pro Sack)
            werden per Regression aus den Spielen abgeleitet, damit Läufe und Sacks nicht doppelt zählen.
          </p>
        </section>

        <section>
          <h3>Wie Spieler verglichen werden</h3>
          <p>
            <b>1. Glätten zum Ligaschnitt.</b> Jede Quote wird so berechnet: (Ereignisse + k × Ligaschnitt) ÷ (Versuche + k).
            Wenige Versuche bleiben nahe am Schnitt, viele behalten ihren Unterschied. Beispiel Fangquote (Liga {pct(L.catchPerTarget)}, k = {k}):
          </p>
          <table className="sim-method__table">
            <thead><tr><th>Receiver</th><th>roh</th><th>in der Simulation</th></tr></thead>
            <tbody>
              <tr><td>8 von 10 Targets gefangen</td><td>80 %</td><td>{pct(exSmall)}</td></tr>
              <tr><td>80 von 100 Targets gefangen</td><td>80 %</td><td>{pct(exBig)}</td></tr>
            </tbody>
          </table>
          <p>
            <b>2. Offense gegen Defense.</b> Die beteiligten Werte werden relativ zum Ligaschnitt verrechnet (Log-Odds):
            Ein Receiver über dem Schnitt erhöht die Chance auf eine Reception, eine Defense, die wenig zulässt, senkt sie.
            Quarterback und Receiver zählen je {nf(PARAMS.w.qbCmp)}-fach, weil beide teilweise dieselben Würfe messen.
          </p>
          <p>
            <b>3. Direkte Aufeinandertreffen.</b> Werte eines Spielers aus den Spielen gegen genau dieses Team ergänzen die
            Saisonwerte – Gewicht Targets ÷ (Targets + {PARAMS.h2h.kTargets}), höchstens {pct(PARAMS.h2h.cap)} (erreicht ab etwa
            {' '}{Math.ceil((PARAMS.h2h.cap * PARAMS.h2h.kTargets) / (1 - PARAMS.h2h.cap))} Targets gegen dieses Team).
            Ein einzelnes Duell ist kein Beweis für das nächste.
          </p>
          <p className="sim-muted">
            Ligaschnitte {data.season}: Sack {pct(L.sack, 1)} der Dropbacks · Completion {pct(L.cmpPerAtt)} · Interception {pct(L.intPerAtt, 1)} pro Pass ·
            {' '}{nf(L.ypc)} Yards pro Reception · {nf(L.ypcRun)} Yards pro Lauf · Fumble {pct(L.fumblePerTouch, 1)} pro Ballkontakt · Field Goal {pct(L.fg)} ·
            4th Down ausgespielt: {pct(L.goRate4th)} der Situationen.
          </p>
        </section>

        <section>
          <h3>Annahmen (Simulationsparameter)</h3>
          <p>Was die Daten nicht hergeben, ist als Annahme gekennzeichnet und per Rücktest eingestellt – es sind keine Spielerstatistiken.</p>
          <ul>
            <li><b>Länge einzelner Spielzüge:</b> meist enge Streuung um den Spielerwert, selten ein Big Play
              (Läufe {pct(B.run.p)}, Catches {pct(B.pass.p)} der Fälle). Der Durchschnitt bleibt der des Spielers.</li>
            <li><b>Spielzugwahl:</b> Pass-/Laufquote des Teams, angepasst an die Situation (3rd & lang mehr Pässe, kurze Distanz mehr Läufe, Rückstand spät mehr Pässe).</li>
            <li><b>4th Down:</b> echte Go-for-it-Quote des Teams, verschoben nach Distanz und Feldposition.</li>
            <li><b>Field Goals:</b> Trefferquote des Kickers, sinkend mit der Distanz.</li>
            <li><b>Uhr:</b> 4 × 12 Minuten; Sekunden pro Spielzug so gewählt, dass die Zahl der Spielzüge der echten entspricht ({nf(L.runningSeconds, 0)} s bei laufender Uhr).</li>
            <li><b>Nicht modelliert:</b> Verletzungen, Wechsel im Spiel, Timeouts, Overtime (Unentschieden bleibt stehen), Heimvorteil.</li>
          </ul>
        </section>

        <section>
          <h3>Wie gut passt das zur Realität?</h3>
          {bt ? (
            <>
              <p>
                Rücktest: Jedes der {bt.games} echten Spiele {data.season} wurde {bt.runsPerGame}-mal simuliert und mit den echten Werten
                verglichen (Durchschnitt pro Team und Spiel).
              </p>
              <table className="sim-method__table">
                <thead><tr><th>Kennzahl</th><th>echt</th><th>Simulation</th><th>Abweichung</th></tr></thead>
                <tbody>
                  {bt.rows.map((r) => {
                    const dev = r.real ? (r.sim - r.real) / Math.abs(r.real) : 0;
                    return (
                      <tr key={r.key}>
                        <td>{r.label}</td><td>{nf(r.real)}</td><td>{nf(r.sim)}</td>
                        <td className={Math.abs(dev) > 0.1 ? 'is-off' : ''}>{dev >= 0 ? '+' : '−'}{pct(Math.abs(dev))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p>
                Sieger richtig vorhergesagt: <b>{bt.winner.hits} von {bt.winner.decided}</b> Spielen · Brier-Score {nf(bt.winner.brier, 3)} (Münzwurf: 0,250, kleiner ist besser).
              </p>
              <p className="sim-muted">
                Wichtig: Das Modell kennt die Saisonwerte genau der Spiele, gegen die es geprüft wird (In-Sample). Der Test zeigt, dass die
                Mechanik realistische Spiele erzeugt – er belegt keine Vorhersagekraft für künftige Spiele.
              </p>
            </>
          ) : btMissing ? (
            <p className="sim-muted">Rücktest-Ergebnis fehlt – im Ordner trap-view <code>npm run data</code> ausführen.</p>
          ) : <p className="sim-muted">Lade Rücktest …</p>}
        </section>

        <section>
          <h3>Die Darstellung</h3>
          <p>
            Die Aufstellung stammt aus derselben Starting-Lineup-Logik wie die Trap View; unbesetzte Plätze bleiben leer.
            Die Bewegungen – Routen, Blocks, Deckung, Verfolgung – werden passend zum berechneten Ergebnis gewählt. Sie sind
            Darstellung, keine Daten: Die Bögen enthalten keine Laufwege. Spezialteams sind namenlos, weil ihre Besetzung nicht
            erfasst ist.
          </p>
        </section>
      </div>
    </div>
  );
}

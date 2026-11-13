/**
 * Mehrfachsimulation: dasselbe Duell N-mal mit neuen Zufallsverläufen.
 *
 * Zeigt, wie viel eines einzelnen Ergebnisses Zufall ist und wie viel Stärke: Siegchance,
 * Verteilung der Punktdifferenz, häufigste Spielstände, Durchschnittswerte der Spieler.
 * Gleiche Daten (Saison 2026) für jeden Durchlauf – nur der Zufall unterscheidet sich.
 */
import { simulateGame, type Profiles } from './engine.ts';

export interface PlayerAvg {
  team: string;
  id: string;
  name: string;
  passYds: number; passTd: number; int: number;
  rushYds: number; rushTd: number;
  rec: number; recYds: number; recTd: number;
  tackles: number; sacks: number; picks: number;
}

export interface MultiResult {
  runs: number;
  teams: [string, string];
  wins: Record<string, number>;
  ties: number;
  avgPoints: Record<string, number>;
  /** Punktdifferenz (Team 1 − Team 2) je Bereich */
  margins: { from: number; to: number; count: number }[];
  /** Anteil der Spiele, die mit höchstens 7 Punkten entschieden wurden */
  close: number;
  topScores: { score: string; count: number }[];
  players: PlayerAvg[];
}

export class MultiSim {
  private n = 0;
  private wins: Record<string, number>;
  private ties = 0;
  private points: Record<string, number>;
  private margin: number[] = [];
  private scores = new Map<string, number>();
  private box = new Map<string, PlayerAvg>();
  private readonly profiles: Profiles;
  private readonly a: string;
  private readonly b: string;
  private seed: number;

  constructor(profiles: Profiles, a: string, b: string, seed: number) {
    this.profiles = profiles;
    this.a = a;
    this.b = b;
    this.seed = seed;
    this.wins = { [a]: 0, [b]: 0 };
    this.points = { [a]: 0, [b]: 0 };
  }

  /** Simuliert `count` weitere Spiele (für die Wiedergabe in Häppchen, damit die Seite flüssig bleibt). */
  run(count: number) {
    for (let i = 0; i < count; i++) {
      const g = simulateGame(this.profiles, { seed: this.seed++, home: this.a, away: this.b });
      const sa = g.score[this.a], sb = g.score[this.b];
      this.n++;
      this.points[this.a] += sa;
      this.points[this.b] += sb;
      if (sa > sb) this.wins[this.a]++; else if (sb > sa) this.wins[this.b]++; else this.ties++;
      this.margin.push(sa - sb);
      const key = `${sa}:${sb}`;
      this.scores.set(key, (this.scores.get(key) ?? 0) + 1);
      for (const [k, l] of Object.entries(g.box)) {
        const id = k.slice(l.team.length + 1);
        const p = this.box.get(k) ?? { team: l.team, id, name: l.name, passYds: 0, passTd: 0, int: 0, rushYds: 0, rushTd: 0, rec: 0, recYds: 0, recTd: 0, tackles: 0, sacks: 0, picks: 0 };
        p.passYds += l.passingyards; p.passTd += l.touchdownpass; p.int += l.interception;
        p.rushYds += l.runyards; p.rushTd += l.touchdownrun;
        p.rec += l.catched; p.recYds += l.receivingyards; p.recTd += l.touchdowncatch;
        p.tackles += l.tackles; p.sacks += l.sacks; p.picks += l.intercepted;
        this.box.set(k, p);
      }
    }
    return this.n;
  }

  result(): MultiResult {
    const n = Math.max(this.n, 1);
    const edges = [-Infinity, -21, -14, -7, 0, 1, 8, 15, 22, Infinity];
    const margins = edges.slice(0, -1).map((from, i) => ({
      from,
      to: edges[i + 1] - 1,
      count: this.margin.filter((m) => m >= from && m < edges[i + 1]).length,
    }));
    const per = (x: number) => Math.round((x / n) * 10) / 10;
    return {
      runs: this.n,
      teams: [this.a, this.b],
      wins: { ...this.wins },
      ties: this.ties,
      avgPoints: { [this.a]: per(this.points[this.a]), [this.b]: per(this.points[this.b]) },
      margins,
      close: this.margin.filter((m) => Math.abs(m) <= 7).length / n,
      topScores: [...this.scores].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([score, count]) => ({ score, count })),
      players: [...this.box.values()].map((p) => ({
        ...p,
        passYds: per(p.passYds), passTd: per(p.passTd), int: per(p.int),
        rushYds: per(p.rushYds), rushTd: per(p.rushTd),
        rec: per(p.rec), recYds: per(p.recYds), recTd: per(p.recTd),
        tackles: per(p.tackles), sacks: per(p.sacks), picks: per(p.picks),
      })),
    };
  }
}

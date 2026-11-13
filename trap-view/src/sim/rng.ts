/**
 * Zufallsgenerator mit Startwert (mulberry32). Gleicher Seed → gleicher Spielverlauf (teilbar,
 * nachprüfbar); neuer Seed → neuer Verlauf. Jede Entscheidung der Engine zieht hieraus.
 */
export interface Rng {
  /** gleichverteilt in [0, 1) */
  next(): number;
  /** true mit Wahrscheinlichkeit p */
  chance(p: number): boolean;
  /** Index nach Gewichten (alle ≥ 0, Summe > 0) */
  weighted(weights: number[]): number;
  /** Normalverteilung */
  normal(mean: number, sd: number): number;
  /** Lognormal mit gewünschtem Mittelwert und Streuung sigma (Log-Skala) */
  lognormal(mean: number, sigma: number): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (mean: number, sd: number) => {
    const u = Math.max(next(), 1e-12);
    const v = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return {
    next,
    chance: (p) => next() < p,
    weighted(weights) {
      const total = weights.reduce((x, w) => x + Math.max(w, 0), 0);
      if (total <= 0) return Math.floor(next() * weights.length);
      let r = next() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= Math.max(weights[i], 0);
        if (r < 0) return i;
      }
      return weights.length - 1;
    },
    normal,
    lognormal(mean, sigma) {
      if (mean <= 0) return 0;
      const mu = Math.log(mean) - (sigma * sigma) / 2;
      return Math.exp(normal(mu, sigma));
    },
  };
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

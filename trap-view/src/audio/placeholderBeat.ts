/**
 * PLATZHALTER – synthetischer Trap-Rhythmus, vollständig im Browser erzeugt.
 * Dient nur dazu, Timing und Stimmung zu testen, bis der echte Track unter
 * public/audio/track.mp3 liegt. Enthält kein fremdes Audiomaterial.
 */
const BPM = 140;
const STEP = 60 / BPM / 4; // Sechzehntel
const STEPS = 64; // 4 Takte
const INTRO_STEPS = 64; // ein Durchlauf ohne Drums

// 808-Bass: Schritt → Frequenz (F-Moll)
const BASS: Record<number, number> = {
  0: 43.65, 6: 43.65, 11: 43.65, 16: 43.65, 23: 51.91, 27: 38.89,
  32: 43.65, 38: 43.65, 43: 43.65, 48: 34.65, 54: 34.65, 59: 38.89,
};
const BELL: Record<number, number> = {
  0: 349.23, 3: 415.3, 6: 523.25, 12: 554.37, 16: 523.25, 22: 415.3,
  32: 349.23, 35: 415.3, 38: 622.25, 44: 554.37, 48: 523.25, 56: 311.13,
};

export class PlaceholderBeat {
  private out: GainNode;
  private delay: DelayNode;
  private noise: AudioBuffer;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;

  constructor(private ctx: AudioContext, destination: AudioNode) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.out = ctx.createGain();
    this.out.gain.value = 0.85;
    this.out.connect(comp).connect(destination);

    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = STEP * 3;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(wet).connect(this.out);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  start() {
    this.stop();
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.play(this.step, this.nextTime);
      this.step++;
      this.nextTime += STEP;
    }
  }

  private play(n: number, t: number) {
    const s = n % STEPS;
    const drums = n >= INTRO_STEPS;
    if (BELL[s]) this.bell(t, BELL[s]);
    if (!drums) {
      if (s % 8 === 4) this.hat(t, 0.12);
      return;
    }
    if (BASS[s]) this.bass(t, BASS[s], STEP * 5);
    if (s % 16 === 8) this.clap(t);
    if (s % 2 === 0) this.hat(t, s % 4 === 0 ? 0.3 : 0.2);
    // Hi-Hat-Rolls am Ende von Takt 2 und 4
    if ((s >= 28 && s < 32) || (s >= 58 && s < 64)) {
      this.hat(t + STEP / 3, 0.14);
      this.hat(t + (STEP * 2) / 3, 0.17);
    }
  }

  private bass(t: number, f: number, dur: number) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 3, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.95, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i / 255) * 2 - 1) * 2.4);
    shaper.curve = curve;
    o.connect(g).connect(shaper).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(t: number, type: BiquadFilterType, freq: number, peak: number, decay: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.02);
  }

  private hat(t: number, vel: number) {
    this.burst(t, 'highpass', 8200, vel, 0.045);
  }

  private clap(t: number) {
    this.burst(t, 'bandpass', 1700, 0.5, 0.02);
    this.burst(t + 0.012, 'bandpass', 1700, 0.5, 0.02);
    this.burst(t + 0.026, 'bandpass', 1900, 0.6, 0.2);
  }

  private bell(t: number, f: number) {
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.value = f;
    o2.type = 'sine';
    o2.frequency.value = f * 2.01;
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(g);
    o2.connect(g);
    g.connect(lp);
    lp.connect(this.out);
    lp.connect(this.delay);
    o.start(t);
    o2.start(t);
    o.stop(t + 1);
    o2.stop(t + 1);
  }
}

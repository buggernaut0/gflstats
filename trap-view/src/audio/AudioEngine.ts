/** Grundpegel des Tracks (vorher 0,5 → jetzt rund −6 dB leiser). Der Regler (0–1) skaliert darunter. */
const TRACK_GAIN = 0.25;
/** Einblenden beim Betreten der Trap View – lang und weich, damit kein Lautstärkesprung entsteht. */
const FADE_IN = 4.5;
/** Ausblenden beim Verlassen. */
const FADE_OUT = 0.8;

/** Weiche Blendkurve (Smoothstep): beginnt und endet ohne Knick. */
function fadeCurve(from: number, to: number): Float32Array {
  const c = new Float32Array(64);
  for (let i = 0; i < c.length; i++) {
    const x = i / (c.length - 1);
    c[i] = from + (to - from) * x * x * (3 - 2 * x);
  }
  return c;
}

/**
 * idle    – nichts gestartet
 * playing – Musik läuft
 * blocked – der Browser hat die Wiedergabe verweigert (Autoplay-Regel); `unlock()` aus einem Klick heraus hilft
 * missing – Datei fehlt oder ist nicht abspielbar; die Präsentation bleibt still
 */
export type AudioStatus = 'idle' | 'playing' | 'blocked' | 'missing';

/**
 * Kapselt die gesamte Musikwiedergabe (eine Datei, in Schleife).
 *
 * Autoplay: `start()` und `unlock()` müssen direkt in einem Klick/Tastendruck aufgerufen werden.
 * Deshalb passiert dort nichts Asynchrones vor `play()` – sonst verliert z. B. Safari die Freigabe.
 * Zwei GainNodes hintereinander (iOS ignoriert `audio.volume`):
 *   fader  – Ein-/Ausblenden beim Betreten und Verlassen (0 → 1 → 0), läuft als Kurve
 *   master – Pegel aus Regler und Stummschaltung
 * Getrennt, damit ein Griff zum Lautstärkeregler eine laufende Einblendung weder abbricht noch springen lässt.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private fader: GainNode | null = null;
  private element: HTMLAudioElement | null = null;
  private src = '';
  private volume = 0.7;
  private muted = false;
  private stopTimer = 0;
  /** Soll gerade Musik laufen? Steuert das Fortsetzen nach einem Tab-Wechsel. */
  private wanted = false;
  status: AudioStatus = 'idle';
  onStatus: ((s: AudioStatus) => void) | null = null;

  /** Startet die Musik von vorn. Nur aus einer Nutzeraktion heraus aufrufen. */
  start(src: string) {
    window.clearTimeout(this.stopTimer);
    this.wanted = true;
    const el = this.ensure(src);
    if (!el) return;
    try {
      el.currentTime = 0;
    } catch {
      /* noch keine Metadaten – die Wiedergabe beginnt ohnehin vorn */
    }
    // Immer aus der Stille einblenden – auch wenn ein vorheriges Ausblenden noch lief
    this.fadeTo(1, FADE_IN, 0);
    this.play();
  }

  /** Setzt die Wiedergabe fort, nachdem der Browser sie blockiert hatte. Nur aus einer Nutzeraktion heraus. */
  unlock() {
    if (!this.element) return;
    this.wanted = true;
    this.fadeTo(1, FADE_IN);
    this.play();
  }

  /** Blendet aus und hält an. */
  stop() {
    this.wanted = false;
    this.fadeTo(0, FADE_OUT);
    window.clearTimeout(this.stopTimer);
    this.stopTimer = window.setTimeout(() => this.element?.pause(), FADE_OUT * 1000 + 100);
    this.set('idle');
  }

  /** Tab im Hintergrund: Musik anhalten statt ohne Bild weiterlaufen zu lassen; beim Zurückkehren fortsetzen. */
  setHidden(hidden: boolean) {
    if (!this.element || !this.wanted) return;
    if (hidden) this.element.pause();
    else this.play();
  }

  setVolume(v: number) {
    this.volume = v;
    this.apply();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.apply();
  }

  /** Gibt Audio-Element und AudioContext frei. Die Engine kann danach erneut gestartet werden. */
  dispose() {
    window.clearTimeout(this.stopTimer);
    this.wanted = false;
    if (this.element) {
      this.element.pause();
      this.element.removeAttribute('src');
      this.element.load();
    }
    void this.ctx?.close().catch(() => undefined);
    this.element = null;
    this.ctx = null;
    this.master = null;
    this.fader = null;
    this.src = '';
    this.status = 'idle';
  }

  private ensure(src: string): HTMLAudioElement | null {
    if (this.element && this.src === src) return this.element;
    this.dispose();
    this.wanted = true;
    try {
      const el = new Audio();
      el.loop = true;
      el.preload = 'auto';
      // Fremde Herkunft nur mit CORS – sonst liefert der AudioContext stumm Nullen statt eines Fehlers
      el.crossOrigin = 'anonymous';
      el.addEventListener('error', () => {
        if (this.element === el) this.set('missing');
      });
      el.src = src;
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.level();
        this.master.connect(this.ctx.destination);
        this.fader = this.ctx.createGain();
        this.fader.gain.value = 0;
        this.fader.connect(this.master);
        this.ctx.createMediaElementSource(el).connect(this.fader);
      }
      this.element = el;
      this.src = src;
      return el;
    } catch {
      this.set('missing');
      return null;
    }
  }

  private play() {
    const el = this.element;
    if (!el) return;
    void this.ctx?.resume().catch(() => undefined);
    el.play().then(
      () => {
        if (this.element === el && this.wanted) this.set('playing');
      },
      (err: unknown) => {
        if (this.element !== el) return;
        const name = err instanceof DOMException ? err.name : '';
        // AbortError: pause() kam dem Start zuvor (z. B. schneller Exit) – kein Fehler
        if (name === 'NotAllowedError') this.set('blocked');
        else if (name !== 'AbortError') this.set('missing');
      },
    );
  }

  /**
   * Blendet den Fader von seinem aktuellen Wert (oder `from`) weich auf `to`. Eine laufende Blende wird
   * an ihrem momentanen Wert übernommen – kein Sprung, auch bei schnellem Exit/Restart.
   */
  private fadeTo(to: number, duration: number, from?: number) {
    const { ctx, fader } = this;
    if (!ctx || !fader) {
      if (this.element) this.element.volume = this.level();
      return;
    }
    const now = ctx.currentTime;
    const start = from ?? fader.gain.value;
    fader.gain.cancelScheduledValues(now);
    try {
      fader.gain.setValueCurveAtTime(fadeCurve(start, to), now, duration);
    } catch {
      fader.gain.setValueAtTime(start, now);
      fader.gain.setTargetAtTime(to, now, duration / 4);
    }
  }

  private level() {
    return this.muted ? 0 : this.volume * TRACK_GAIN;
  }

  private apply() {
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.05);
    else if (this.element) this.element.volume = this.level();
  }

  private set(s: AudioStatus) {
    if (s === this.status) return;
    this.status = s;
    this.onStatus?.(s);
  }
}

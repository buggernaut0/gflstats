/** Grundpegel des Tracks: halbe Lautstärke. Der Regler (0–1) skaliert darunter. */
const TRACK_GAIN = 0.5;
const FADE_IN = 1.2;

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
 * Lautstärke und Stummschaltung laufen über einen GainNode (iOS ignoriert `audio.volume`).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
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
    this.fadeIn();
    this.play();
  }

  /** Setzt die Wiedergabe fort, nachdem der Browser sie blockiert hatte. Nur aus einer Nutzeraktion heraus. */
  unlock() {
    if (!this.element) return;
    this.wanted = true;
    this.fadeIn();
    this.play();
  }

  /** Blendet aus und hält an. */
  stop() {
    this.wanted = false;
    const { ctx, master } = this;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    }
    window.clearTimeout(this.stopTimer);
    this.stopTimer = window.setTimeout(() => this.element?.pause(), 500);
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
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
        this.ctx.createMediaElementSource(el).connect(this.master);
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

  private fadeIn() {
    const { ctx, master } = this;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(this.level(), ctx.currentTime + FADE_IN);
    } else if (this.element) {
      this.element.volume = this.level();
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

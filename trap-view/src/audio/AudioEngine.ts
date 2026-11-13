import { PlaceholderBeat } from './placeholderBeat';

/**
 * Kapselt die gesamte Musikwiedergabe. Spielt die übergebene Audiodatei, sofern sie
 * existiert, sonst den synthetischen Platzhalter. Muss aus einer Nutzeraktion heraus
 * gestartet werden (Browser-Autoplay-Regeln) – auf der Auswahloberfläche bleibt es still.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private element: HTMLAudioElement | null = null;
  private beat: PlaceholderBeat | null = null;
  private startedAt = 0;
  private volume = 0.7;
  private muted = false;
  private session = 0;
  /** true, solange der Platzhalter statt einer echten Datei läuft. */
  usingPlaceholder = false;

  /** Startet die Musik von vorn. `src` ist die austauschbare Audiodatei. */
  async start(src: string) {
    const session = ++this.session;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    const ctx = this.ctx;
    const master = this.master!;
    void ctx.resume();
    this.halt();

    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this.level(), ctx.currentTime + 1.2);

    const hasFile = await this.probe(src);
    if (session !== this.session) return;

    this.startedAt = ctx.currentTime;
    if (hasFile) {
      if (!this.element) {
        this.element = new Audio(src);
        this.element.loop = true;
        ctx.createMediaElementSource(this.element).connect(master);
      }
      this.element.currentTime = 0;
      this.usingPlaceholder = false;
      void this.element.play();
    } else {
      this.beat ??= new PlaceholderBeat(ctx, master);
      this.usingPlaceholder = true;
      this.beat.start();
    }
  }

  /** Blendet aus und stoppt. */
  stop() {
    this.session++;
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    const session = this.session;
    window.setTimeout(() => {
      if (session === this.session) this.halt();
    }, 500);
  }

  setVolume(v: number) {
    this.volume = v;
    this.apply();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.apply();
  }

  /** Sekunden seit Start des Tracks – Grundlage für die spätere Musik-Synchronisation. */
  get currentTime(): number {
    if (this.element && !this.usingPlaceholder) return this.element.currentTime;
    return this.ctx ? this.ctx.currentTime - this.startedAt : 0;
  }

  private level() {
    return this.muted ? 0 : this.volume;
  }

  private apply() {
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.05);
  }

  private halt() {
    this.beat?.stop();
    this.element?.pause();
  }

  private async probe(src: string): Promise<boolean> {
    try {
      const res = await fetch(src, { method: 'HEAD' });
      return res.ok && (res.headers.get('content-type') ?? '').startsWith('audio');
    } catch {
      return false;
    }
  }
}

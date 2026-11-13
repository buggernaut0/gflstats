/**
 * Kapselt die gesamte Musikwiedergabe (public/audio/track.mp3, in Schleife). Fehlt die Datei,
 * bleibt es still. Muss aus einer Nutzeraktion heraus
 * gestartet werden (Browser-Autoplay-Regeln) – auf der Auswahloberfläche bleibt es still.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private element: HTMLAudioElement | null = null;
  private startedAt = 0;
  private volume = 0.7;
  private muted = false;
  private session = 0;
  /** false, wenn die Audiodatei nicht geladen werden konnte. */
  available = true;

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
    this.available = hasFile;
    if (!hasFile) return;
    if (!this.element) {
      this.element = new Audio(src);
      this.element.loop = true;
      ctx.createMediaElementSource(this.element).connect(master);
    }
    this.element.currentTime = 0;
    void this.element.play();
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
    if (this.element && this.available) return this.element.currentTime;
    return this.ctx ? this.ctx.currentTime - this.startedAt : 0;
  }

  private level() {
    return this.muted ? 0 : this.volume;
  }

  private apply() {
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.05);
  }

  private halt() {
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

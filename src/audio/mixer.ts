import type { MusicId, SfxId } from '../content/sound.ts';
import type { NarrationTiming } from '../content/narration-timing.ts';

const BASE = import.meta.env.BASE_URL;
const OPEN_FILTER = 20000;
const UNDERWATER_FILTER = 520;
/** Trim each end of a loop so MP3 encoder padding never leaves a gap at the seam. */
const LOOP_TRIM = 0.03;

interface Loop {
  readonly src: AudioBufferSourceNode;
  readonly gain: GainNode;
}

interface Track {
  readonly el: HTMLAudioElement;
  readonly gain: GainNode;
  /** Pending pause after a fade-out; one per track so a quick back-and-forth never cuts it early. */
  pauseTimer?: ReturnType<typeof setTimeout>;
}

export class Mixer {
  readonly ctx = new AudioContext();
  private readonly master = this.ctx.createGain();
  private readonly filter = this.ctx.createBiquadFilter();
  private readonly musicBus = this.ctx.createGain();
  private readonly ambienceBus = this.ctx.createGain();
  private readonly sfxBus = this.ctx.createGain();
  private readonly voiceBus = this.ctx.createGain();
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  private readonly loops = new Map<SfxId, Loop>();
  private readonly tracks = new Map<MusicId, Track>();
  private currentMusic?: MusicId;
  private voice?: { src: AudioBufferSourceNode; startedAt: number };
  /** Bumped by every play/stop, so a play still loading when a newer request comes in never starts. */
  private voiceRequest = 0;
  private paused = false;

  constructor() {
    this.filter.type = 'lowpass';
    this.filter.frequency.value = OPEN_FILTER;
    this.filter.Q.value = 0.8;
    this.musicBus.gain.value = 0.85;
    this.ambienceBus.gain.value = 1;
    for (const bus of [this.musicBus, this.ambienceBus, this.sfxBus]) bus.connect(this.filter);
    this.filter.connect(this.master);
    this.voiceBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    // Lets iPhone/iPad play sound even with the ring/silent switch on (Safari 16.4+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
  }

  /** Must be called from a user gesture. */
  unlock(): void {
    void this.ctx.resume();
  }

  load(path: string): Promise<AudioBuffer> {
    let buffer = this.buffers.get(path);
    if (!buffer) {
      buffer = fetch(`${BASE}${path}`)
        .then((r) => {
          if (!r.ok) throw new Error(`${path}: ${r.status}`);
          return r.arrayBuffer();
        })
        .then((data) => this.ctx.decodeAudioData(data));
      buffer.catch(() => this.buffers.delete(path));
      this.buffers.set(path, buffer);
    }
    return buffer;
  }

  preload(ids: readonly SfxId[]): Promise<unknown> {
    return Promise.allSettled(ids.map((id) => this.load(sfxPath(id))));
  }

  playSfx(id: SfxId, volume = 1): void {
    this.load(sfxPath(id))
      .then((buffer) => {
        const src = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        src.buffer = buffer;
        src.connect(gain).connect(this.sfxBus);
        src.start();
      })
      .catch((e: unknown) => console.warn('sfx', id, e));
  }

  setAmbience(ids: readonly SfxId[]): void {
    const now = this.ctx.currentTime;
    for (const [id, loop] of this.loops) {
      if (ids.includes(id)) continue;
      this.loops.delete(id);
      loop.gain.gain.setTargetAtTime(0, now, 0.5);
      // A loop whose file is still loading was never started, and stop() before start() throws.
      if (loop.src.buffer) loop.src.stop(now + 3);
    }
    for (const id of ids) {
      if (this.loops.has(id)) continue;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.ambienceBus);
      const src = this.ctx.createBufferSource();
      this.loops.set(id, { src, gain });
      this.load(sfxPath(id))
        .then((buffer) => {
          if (this.loops.get(id)?.src !== src) return;
          src.buffer = buffer;
          src.loop = true;
          src.loopStart = LOOP_TRIM;
          src.loopEnd = buffer.duration - LOOP_TRIM;
          src.connect(gain);
          src.start(this.ctx.currentTime, LOOP_TRIM);
          gain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.6);
        })
        .catch((e: unknown) => console.warn('ambience', id, e));
    }
  }

  setMusic(id: MusicId): void {
    if (id === this.currentMusic) return;
    const now = this.ctx.currentTime;
    const oldId = this.currentMusic;
    const old = oldId ? this.tracks.get(oldId) : undefined;
    if (old) {
      old.gain.gain.setTargetAtTime(0, now, 0.8);
      clearTimeout(old.pauseTimer);
      old.pauseTimer = setTimeout(() => old.el.pause(), 4000);
    }
    this.currentMusic = id;
    let track = this.tracks.get(id);
    if (!track) {
      const el = new Audio(`${BASE}audio/music/${id}.mp3`);
      el.loop = true;
      el.preload = 'auto';
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      this.ctx.createMediaElementSource(el).connect(gain).connect(this.musicBus);
      track = { el, gain };
      this.tracks.set(id, track);
    }
    clearTimeout(track.pauseTimer);
    track.el.currentTime = 0;
    if (!this.paused) track.el.play().catch((e: unknown) => console.warn('music', id, e));
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.setTargetAtTime(1, now, 0.9);
  }

  /** Silences the current music (freeze-frame) or brings it back, leaving voice and effects alone. */
  holdMusic(held: boolean): void {
    const track = this.currentMusic ? this.tracks.get(this.currentMusic) : undefined;
    if (!track) return;
    track.gain.gain.setTargetAtTime(held ? 0 : 1, this.ctx.currentTime, held ? 0.05 : 0.8);
  }

  async narrationTiming(pageId: string): Promise<NarrationTiming> {
    const res = await fetch(`${BASE}audio/narration/${pageId}.json`);
    if (!res.ok) throw new Error(`timing ${pageId}: ${res.status}`);
    return (await res.json()) as NarrationTiming;
  }

  prefetchNarration(pageId: string): void {
    this.load(`audio/narration/${pageId}.mp3`).catch(() => undefined);
  }

  /**
   * Plays a page's narration from `offset` seconds. Resolves with the context time that
   * corresponds to clip time 0, or undefined if a newer play or stop superseded it while loading.
   */
  async playNarration(pageId: string, offset = 0): Promise<number | undefined> {
    this.stopNarration();
    const request = this.voiceRequest;
    const buffer = await this.load(`audio/narration/${pageId}.mp3`);
    if (request !== this.voiceRequest) return undefined;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.voiceBus);
    const startedAt = this.ctx.currentTime - offset;
    src.start(this.ctx.currentTime, offset);
    this.voice = { src, startedAt };
    this.duck(true);
    src.onended = () => {
      if (this.voice?.src === src) {
        this.voice = undefined;
        this.duck(false);
      }
    };
    return startedAt;
  }

  stopNarration(): void {
    this.voiceRequest++;
    if (!this.voice) return;
    const { src } = this.voice;
    this.voice = undefined;
    src.onended = null;
    try {
      src.stop();
    } catch {
      // already stopped
    }
    this.duck(false);
  }

  setUnderwater(on: boolean): void {
    this.filter.frequency.setTargetAtTime(on ? UNDERWATER_FILTER : OPEN_FILTER, this.ctx.currentTime, on ? 0.25 : 0.6);
  }

  setMuted(muted: boolean): void {
    this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.1);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    const track = this.currentMusic ? this.tracks.get(this.currentMusic) : undefined;
    if (paused) {
      track?.el.pause();
      void this.ctx.suspend();
    } else {
      void this.ctx.resume();
      track?.el.play().catch(() => undefined);
    }
  }

  private duck(on: boolean): void {
    const now = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(on ? 0.45 : 0.85, now, 0.4);
    this.ambienceBus.gain.setTargetAtTime(on ? 0.65 : 1, now, 0.4);
  }
}

const sfxPath = (id: SfxId): string => `audio/sfx/${id}.mp3`;

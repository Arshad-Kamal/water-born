// Runs the reading: what happens when a page turns and settles, how the words ink in
// (following the narrator, or at reading pace), and the scene cues, push-ins and
// interactions anchored to the words.
import * as THREE from 'three';
import { artImage, artUrl, hasArt } from './assets.ts';
import type { Mixer } from './audio/mixer.ts';
import { blockStarts, book, pageText, type Page } from './content/book.ts';
import { spokenChars, type NarrationTiming } from './content/narration-timing.ts';
import { CARDS_PHRASE, COUNT_WORDS, FIRES_OUT_PHRASE, SCENES, TEAM, type Cue, type Scene } from './content/scenes.ts';
import type { Backdrop } from './engine/backdrop.ts';
import { PAGE_H, PAGE_W, type Book } from './engine/book3d.ts';
import type { Cinema } from './engine/cinema.ts';
import { INK_TAIL } from './engine/ink.ts';
import type { Particles } from './engine/particles.ts';
import type { Framing, Stage } from './engine/stage.ts';
import { wait } from './engine/ticker.ts';
import { pageAt, spreadOf, type Surfaces } from './surfaces.ts';
import { chapterOf, Hud } from './ui/hud.ts';
import { Cards, Count, Fires, punch, replayButton, TurnHint, type Point } from './ui/overlays.ts';

/** Reading pace when nobody is narrating, characters per second. */
const READ_CPS = 16;
/** Slowest the ink catches up to the reading position, characters per second. */
const INK_CATCH_UP = 30;
/** Narration resumes this many seconds before a gated word so its first sound is not clipped. */
const GATE_LEAD_IN = 0.08;
/** Seconds an interaction waits for a tap before it resolves itself. */
const GATE_AUTO_SECONDS = 4;
const HINT_AFTER_SECONDS = 1.2;
/** With narration on, seconds after a page finishes before the next turns by itself. */
const AUTO_TURN_SECONDS = 2.5;
const TITLE_HOLD_SECONDS = 3;
const FREEZE_CLASS = 'frozen';
const CINEMATIC_CLASS = 'cinematic';
const PUSH_IN_SECONDS = 5.5;
/** Backdrop brightness behind story spreads, and the dimmer one behind cover, title and credits. */
const STORY_BACKDROP = 0.5;
const QUIET_BACKDROP = 0.22;
/** Where the fires burn on the last-fire picture (page UV, v up). */
const FIRE_SPOTS: readonly [number, number][] = [
  [0.24, 0.3],
  [0.52, 0.2],
  [0.78, 0.36],
  [0.4, 0.48],
];

interface Mark {
  /** Fires once the reading position passes this character index. */
  readonly index: number;
  /** `silent` when the reader skipped ahead: apply the state, skip sound and spectacle. */
  run(silent: boolean): void;
  /** Present for marks that pause the reading until a tap (or a timeout) resolves them. */
  readonly resolve?: (silent: boolean) => void;
}

interface Reading {
  readonly pageIndex: number;
  readonly page: Page;
  readonly scene: Scene;
  readonly starts: readonly number[];
  readonly total: number;
  readonly marks: Mark[];
  next: number;
  /** 'intro' while a push-in plays; the words wait. */
  mode: 'intro' | 'voice' | 'timed';
  /** Characters the reading has reached (narration position or reading pace). */
  clock: number;
  /** Characters inked in on the page; follows `clock` smoothly and never goes back. */
  reveal: number;
  /** The reader tapped to see the whole text while the narrator carries on. */
  revealAll: boolean;
  timing?: NarrationTiming;
  startedAt: number;
  /** Narration is loading or restarting; hold the clock. */
  resuming: boolean;
  narrationOver: boolean;
  doneFor: number;
}

interface Gate {
  readonly mark: Mark;
  elapsed: number;
}

interface Interactions {
  cards?: Cards;
  count?: Count;
  fires?: Fires;
}

export interface DirectorParts {
  readonly stage: Stage;
  readonly book: Book;
  readonly mixer: Mixer;
  readonly surfaces: Surfaces;
  readonly particles: Particles;
  readonly backdrop: Backdrop;
  readonly cinema: Cinema;
  /** Root element; gets the cinematic (letterbox) class. */
  readonly app: HTMLElement;
  /** Layer for effects over the book (sound words, cards, fires). */
  readonly fx: HTMLElement;
  /** Layer for controls (HUD, replay). */
  readonly ui: HTMLElement;
  /** Screen-reader live region that receives each page's text. */
  readonly captions: HTMLElement;
}

const sceneForSpread = (spread: number): Scene => {
  const index = Math.min(Math.max(spread - spreadOf(0), 0), book.pages.length - 1);
  return SCENES[book.pages[index]!.scene]!;
};

export class Director {
  private readonly p: DirectorParts;
  private readonly hud: Hud;
  private readonly hint: TurnHint;
  private started = false;
  private voice = true;
  private paused = false;
  /** Spread the book is at or heading to. */
  private spread = 0;
  /** Spread at which the book last came to rest. */
  private settled = 0;
  /** A turn started since the last settle (a cancelled drag settles without one). */
  private turning = false;
  /** Bumped on every turn; async work started for an older spread checks it and stops. */
  private token = 0;
  private reading?: Reading;
  private gate?: Gate;
  private interactions: Interactions = {};
  private replay?: HTMLButtonElement;
  private skipPushIn = false;
  private idleFor = 0;
  private frozen = false;
  private readonly v = new THREE.Vector3();
  private readonly ndc = new THREE.Vector2();

  constructor(parts: DirectorParts) {
    this.p = parts;
    this.hud = new Hud(parts.ui, {
      toggleVoice: () => this.setVoice(!this.voice),
      togglePause: () => this.setPaused(!this.paused),
      goToPage: (i) => this.p.book.turnTo(spreadOf(i), true),
      goToStart: () => this.p.book.turnTo(1, true),
    });
    this.hint = new TurnHint(parts.fx);
    parts.book.onTurnStart = (from, to) => this.turnStarted(from, to);
    parts.book.onSettle = (spread) => this.settle(spread);
    this.setScene(0, false);
    parts.stage.frame(this.framing(0), true);
  }

  /** Called from the start button's click handler (after the mixer is unlocked). */
  begin(voice: boolean): void {
    this.started = true;
    this.voice = voice;
    this.hud.setVoice(voice);
    this.hud.show(true);
    this.p.book.turnTo(1);
  }

  canTurn(dir: 1 | -1): boolean {
    return this.started && (dir === 1 || this.spread > 1);
  }

  next(): void {
    if (this.canTurn(1)) this.p.book.turn(1);
  }

  prev(): void {
    if (this.canTurn(-1)) this.p.book.turn(-1);
  }

  /** A tap on the book (not on an overlay). `side` is which page was tapped. */
  tap(at: Point, side: 1 | -1): void {
    if (!this.started) return;
    if (this.paused) return this.setPaused(false);
    const r = this.reading;
    if (r?.mode === 'intro') {
      this.skipPushIn = true;
      return;
    }
    if (side === -1) return this.prev();
    if (r && this.tapSoundWord(at, r)) return;
    if (this.gate) return this.resolveGate(false);
    if (r && !this.isDone(r) && !r.revealAll) return this.completeReveal(r);
    this.next();
  }

  /** Screen position of the spine and the on-screen width of one page, for drag gestures. */
  spineAndPageWidth(): { spine: Point; pageWidth: number } {
    const { book } = this.p;
    const spine = this.screen(book.pagePoint(0, this.v));
    const edge = this.screen(book.pageUvPoint(1, 1, 0.5, this.v));
    return { spine, pageWidth: Math.max(1, edge.x - spine.x) };
  }

  update(dt: number, time: number): void {
    this.placeOverlays();
    if (!this.started || this.paused) return;
    const r = this.reading;
    if (!r) return this.updateIdle(dt);
    if (this.gate) {
      this.gate.elapsed += dt;
      if (this.gate.elapsed > GATE_AUTO_SECONDS) this.resolveGate(false);
    } else if (r.mode === 'timed') {
      r.clock = Math.min(r.total, r.clock + READ_CPS * dt);
    } else if (r.mode === 'voice' && !r.resuming && r.timing) {
      this.followNarration(r, r.timing);
    }
    this.advanceMarks(r, false);

    const done = this.isDone(r);
    const target = done || r.revealAll ? r.total + INK_TAIL : r.clock;
    if (target > r.reveal) r.reveal = Math.min(target, r.reveal + Math.max(INK_CATCH_UP, (target - r.reveal) * 6) * dt);
    this.p.surfaces.setReveal(r.pageIndex, r.reveal);

    r.doneFor = done ? r.doneFor + dt : 0;
    this.invite(r.doneFor > HINT_AFTER_SECONDS, time);
    if (this.voice && r.doneFor > AUTO_TURN_SECONDS) this.next();
  }

  // ---------- turning ----------

  private turnStarted(from: number, to: number): void {
    this.token++;
    this.spread = to;
    this.turning = true;
    this.leavePage();
    this.p.mixer.playSfx(from === 0 ? 'book-open' : 'page-turn');
    this.setScene(to, this.started);
    this.p.stage.frame(this.framing(to));
    this.hud.setPage(pageAt(to));
  }

  private settle(spread: number): void {
    // A cancelled drag settles where it started; the page in progress carries on.
    if (!this.turning) return;
    this.turning = false;
    this.settled = spread;
    this.spread = spread;
    this.idleFor = 0;
    const index = pageAt(spread);
    const nextIndex = pageAt(spread + 1);
    if (nextIndex !== undefined) this.p.mixer.prefetchNarration(book.pages[nextIndex]!.id);
    if (spread === this.p.book.leafCount) this.replay = replayButton(this.p.ui, () => this.p.book.turnTo(1, true));
    if (index !== undefined) void this.readPage(index, this.token);
  }

  private leavePage(): void {
    const r = this.reading;
    if (r) this.p.surfaces.setReveal(r.pageIndex, r.total + INK_TAIL);
    this.reading = undefined;
    this.gate = undefined;
    this.skipPushIn = false;
    this.p.mixer.stopNarration();
    this.p.app.classList.remove(CINEMATIC_CLASS);
    this.setFrozen(false);
    this.invite(false, 0);
    this.interactions.cards?.remove();
    this.interactions.count?.remove();
    this.interactions.fires?.remove();
    this.interactions = {};
    this.replay?.remove();
    this.replay = undefined;
  }

  /** Music, ambience, light, particles and backdrop for a spread. Sound only once started. */
  private setScene(spread: number, withSound: boolean): void {
    const scene = sceneForSpread(spread);
    const { mixer, stage, particles } = this.p;
    if (withSound) {
      mixer.setMusic(spread <= 1 ? 'theme' : scene.music);
      mixer.setAmbience(scene.ambience);
      if (!scene.underwater) mixer.setUnderwater(false);
    }
    stage.setGrade(scene.grade);
    particles.set(scene.particles);
    void this.showBackdrop(spread, this.token);
  }

  private async showBackdrop(spread: number, token: number): Promise<void> {
    // Story spreads use their own painting; cover, title and credits prefer the calm chapter plate.
    const story = pageAt(spread);
    const index = story ?? (spread <= 1 ? 0 : book.pages.length - 1);
    const pageArt = book.pages[index]!.id;
    const plate = `plate-ch${chapterOf(index).number}`;
    const name = (story === undefined ? [plate, pageArt] : [pageArt, plate]).find(hasArt);
    const img = name ? await artImage(name) : undefined;
    const brightness = story === undefined ? QUIET_BACKDROP : STORY_BACKDROP;
    if (token === this.token) this.p.backdrop.show(img, img?.naturalWidth ?? 1, img?.naturalHeight ?? 1, brightness);
  }

  private framing(spread: number): Framing {
    const { book } = this.p;
    if (spread === 0) {
      // Closed book, raised a little so the start buttons sit below it.
      const look = book.pagePoint(1, new THREE.Vector3()).add(new THREE.Vector3(0, -0.32, 0));
      return { look, halfW: PAGE_W * 0.75, halfH: PAGE_H * 0.78 };
    }
    return { look: book.pagePoint(0, new THREE.Vector3()), halfW: PAGE_W * 1.04, halfH: PAGE_H * 0.52 };
  }

  // ---------- reading a page ----------

  private async readPage(pageIndex: number, token: number): Promise<void> {
    const page = book.pages[pageIndex]!;
    const scene = SCENES[page.scene]!;
    const text = pageText(page);
    const r: Reading = {
      pageIndex, page, scene, starts: blockStarts(page), total: text.length, marks: [], next: 0,
      mode: 'intro', clock: 0, reveal: 0, revealAll: false, startedAt: 0, resuming: false, narrationOver: false, doneFor: 0,
    };
    this.reading = r;
    this.p.captions.textContent = text;
    this.p.surfaces.setReveal(pageIndex, 0);
    r.marks.push(...this.cueMarks(r, text), ...this.setUpInteraction(r, text));
    r.marks.sort((a, b) => a.index - b.index);

    if (scene.enter) this.p.mixer.playSfx(scene.enter);
    if (scene.underwater) this.p.mixer.setUnderwater(true);
    // Until its painting exists, a push-in would only zoom into a placeholder.
    if (scene.pushIn && (hasArt(page.id) || hasArt(`${page.id}-wide`))) await this.pushIn(r, token);
    if (token !== this.token) return;
    if (this.voice) void this.speak(r, 0);
    else r.mode = 'timed';
  }

  /** Camera pushes into the picture page, the painting fills the screen, then back to the spread. */
  private async pushIn(r: Reading, token: number): Promise<void> {
    const { app, book, stage, cinema } = this.p;
    const alive = (): boolean => token === this.token && !this.skipPushIn;
    app.classList.add(CINEMATIC_CLASS);
    stage.frame({ look: book.pagePoint(-1, new THREE.Vector3()), halfW: PAGE_W * 0.52, halfH: PAGE_H * 0.52 });
    await wait(1.1);
    const wide = `${r.page.id}-wide`;
    const img = alive() ? await artImage(hasArt(wide) ? wide : r.page.id) : undefined;
    if (img && alive()) await cinema.play(img, img.naturalWidth, img.naturalHeight, PUSH_IN_SECONDS, alive);
    if (token !== this.token) return;
    app.classList.remove(CINEMATIC_CLASS);
    stage.frame(this.framing(this.spread));
    await wait(0.7);
  }

  /** Starts (or resumes) the narrator at character `from`; falls back to reading pace if audio fails. */
  private async speak(r: Reading, from: number): Promise<void> {
    r.resuming = true;
    try {
      r.timing ??= await this.p.mixer.narrationTiming(r.page.id);
      const offset = from > 0 ? Math.max(0, timeOf(r.timing, r.starts, from) - GATE_LEAD_IN) : 0;
      const startedAt = await this.p.mixer.playNarration(r.page.id, offset);
      if (startedAt === undefined || r !== this.reading || !this.voice) return;
      r.startedAt = startedAt;
      r.mode = 'voice';
    } catch (e) {
      console.warn('narration unavailable, reading at pace', r.page.id, e);
      if (r === this.reading) r.mode = 'timed';
    } finally {
      r.resuming = false;
    }
  }

  private followNarration(r: Reading, timing: NarrationTiming): void {
    const t = this.p.mixer.ctx.currentTime - r.startedAt;
    if (t >= timing.duration) {
      r.clock = r.total;
      r.narrationOver = true;
      return;
    }
    timing.blocks.forEach((block, i) => {
      const spoken = spokenChars(block.at, t);
      if (spoken > 0) r.clock = Math.max(r.clock, r.starts[i]! + spoken);
    });
  }

  private isDone(r: Reading): boolean {
    return !this.gate && r.mode !== 'intro' && !r.resuming && r.clock >= r.total && (r.mode === 'timed' || r.narrationOver);
  }

  private advanceMarks(r: Reading, silent: boolean): void {
    while (!this.gate && r.next < r.marks.length && r.marks[r.next]!.index < r.clock) {
      const mark = r.marks[r.next++]!;
      mark.run(silent);
      if (!mark.resolve) continue;
      if (silent) {
        mark.resolve(true);
      } else {
        r.clock = mark.index;
        this.gate = { mark, elapsed: 0 };
        if (r.mode === 'voice') this.p.mixer.stopNarration();
      }
    }
  }

  private resolveGate(silent: boolean): void {
    const gate = this.gate;
    const r = this.reading;
    if (!gate || !r) return;
    this.gate = undefined;
    gate.mark.resolve?.(silent);
    r.clock = gate.mark.index + 1;
    if (r.mode === 'voice') void this.speak(r, gate.mark.index);
  }

  /** Tap while the words are still coming: show them all now. */
  private completeReveal(r: Reading): void {
    if (r.mode === 'voice') {
      r.revealAll = true;
      return;
    }
    r.clock = r.total;
    this.advanceMarks(r, true);
  }

  private setVoice(on: boolean): void {
    this.voice = on;
    this.hud.setVoice(on);
    const r = this.reading;
    if (!on) {
      this.p.mixer.stopNarration();
      if (r?.mode === 'voice') r.mode = 'timed';
    } else if (r && r.mode === 'timed' && !this.gate && r.clock < r.total) {
      void this.speak(r, Math.floor(r.clock));
    }
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.p.mixer.setPaused(paused);
    this.hud.setPaused(paused);
  }

  private updateIdle(dt: number): void {
    this.idleFor += dt;
    const onTitle = this.settled === 1 && this.spread === 1;
    this.invite(onTitle && this.idleFor > HINT_AFTER_SECONDS, this.idleFor);
    if (onTitle && this.voice && this.idleFor > TITLE_HOLD_SECONDS) this.next();
  }

  /** Lifts the next page's corner and pulses the turn hint. */
  private invite(on: boolean, time: number): void {
    this.p.book.peek = on ? 0.5 - 0.5 * Math.cos(time * 2.4) : 0;
    this.hint.set(on);
  }

  // ---------- cues and interactions ----------

  private cueMarks(r: Reading, text: string): Mark[] {
    return (r.scene.cues ?? []).map((cue) => ({ index: text.indexOf(cue.phrase), run: (silent) => this.fireCue(cue, r, silent) }));
  }

  private fireCue(cue: Cue, r: Reading, silent: boolean): void {
    if (cue.freeze) this.setFrozen(true);
    if (silent) return;
    this.replayCue(cue);
    if (cue.punch) punch(this.p.fx, cue.phrase, this.cuePoint(cue, r), cue.burst === 'spray', () => this.replayCue(cue));
  }

  private replayCue(cue: Cue): void {
    const { mixer, stage, particles, book } = this.p;
    if (cue.sfx) mixer.playSfx(cue.sfx);
    if (cue.shake) stage.shake(cue.shake);
    if (cue.flash) stage.flash();
    if (cue.burst) particles.burst(cue.burst, book.pagePoint(1, this.v), stage.clockUniform.value);
  }

  /** On screen where a cue's words are printed: the sound word itself, or the text page. */
  private cuePoint(cue: Cue, r: Reading): Point {
    const block = r.page.blocks.findIndex((b) => b.text === cue.phrase);
    const spot = this.p.surfaces.hotspots(r.pageIndex).find((h) => h.block === block);
    const { book } = this.p;
    return this.screen(spot ? book.pageUvPoint(1, (spot.u0 + spot.u1) / 2, (spot.v0 + spot.v1) / 2, this.v) : book.pagePoint(1, this.v));
  }

  /** Tapping a printed sound word ("Boom!") plays it again. */
  private tapSoundWord(at: Point, r: Reading): boolean {
    const hit = this.p.book.hit(this.ndc.set((at.x / innerWidth) * 2 - 1, 1 - (at.y / innerHeight) * 2), this.p.stage.camera);
    if (!hit || hit.leaf !== this.spread || hit.face !== 'front') return false;
    const spot = this.p.surfaces.hotspots(r.pageIndex).find((h) => hit.uv.x >= h.u0 && hit.uv.x <= h.u1 && hit.uv.y >= h.v0 && hit.uv.y <= h.v1);
    const cue = spot && r.scene.cues?.find((c) => c.phrase === r.page.blocks[spot.block]?.text);
    if (!cue || r.reveal <= r.starts[spot.block]!) return false;
    this.replayCue(cue);
    return true;
  }

  private setFrozen(on: boolean): void {
    if (on === this.frozen) return;
    this.frozen = on;
    this.p.stage.renderer.domElement.classList.toggle(FREEZE_CLASS, on);
    this.p.mixer.holdMusic(on);
  }

  private setUpInteraction(r: Reading, text: string): Mark[] {
    const { fx, mixer } = this.p;
    switch (r.scene.interaction) {
      case 'cards': {
        const images = TEAM.map((m) => (hasArt(`card-${m.name.toLowerCase()}`) ? artUrl(`card-${m.name.toLowerCase()}`) : undefined));
        const cards = new Cards(fx, images, () => mixer.playSfx('card-flip'));
        this.interactions.cards = cards;
        return [
          { index: text.indexOf(CARDS_PHRASE), run: () => cards.show() },
          ...TEAM.map((m, i) => ({
            index: text.indexOf(m.name),
            run: (silent: boolean) => {
              cards.light(i);
              if (!silent) mixer.playSfx('card-flip', 0.6);
            },
          })),
        ];
      }
      case 'count': {
        const count = new Count(fx, () => (this.gate ? this.resolveGate(false) : mixer.playSfx('count-chime')));
        this.interactions.count = count;
        return COUNT_WORDS.map((word, i) => ({
          index: text.indexOf(word),
          run: (silent) => count.setPrompt(silent ? '' : 'Tap the drop to count!'),
          resolve: (silent) => {
            count.hit(i);
            count.setPrompt('');
            if (!silent) mixer.playSfx('count-chime');
          },
        }));
      }
      case 'fires': {
        const fires = new Fires(fx, FIRE_SPOTS.length, (i) => {
          if (!fires.out(i)) return;
          mixer.playSfx('steam-hiss', 0.7);
          const [u, v] = FIRE_SPOTS[i]!;
          this.p.particles.burst('spray', this.p.book.pageUvPoint(-1, u, v, this.v), this.p.stage.clockUniform.value);
        });
        this.interactions.fires = fires;
        return [{ index: text.indexOf(FIRES_OUT_PHRASE), run: () => fires.remaining.forEach((i) => fires.out(i)) }];
      }
      default:
        return [];
    }
  }

  // ---------- screen placement ----------

  private screen(world: THREE.Vector3): Point {
    world.project(this.p.stage.camera);
    return { x: ((world.x + 1) / 2) * innerWidth, y: ((1 - world.y) / 2) * innerHeight };
  }

  /** Keeps the HTML overlays pinned to the pages as the camera drifts. */
  private placeOverlays(): void {
    const { book } = this.p;
    const { cards, count, fires } = this.interactions;
    if (cards) {
      const left = this.screen(book.pageUvPoint(-1, 0, 0.5, this.v)).x;
      const right = this.screen(book.pageUvPoint(-1, 1, 0.5, this.v)).x;
      cards.place(this.screen(book.pagePoint(-1, this.v)), right - left);
    }
    count?.place(this.screen(book.pageUvPoint(-1, 0.5, 0.3, this.v)));
    if (fires) FIRE_SPOTS.forEach(([u, v], i) => fires.place(i, this.screen(book.pageUvPoint(-1, u, v, this.v))));
    this.hint.place(this.screen(book.pageUvPoint(1, 0.93, 0.07, this.v)));
  }
}

/** Seconds into the narration clip at which character `index` of the page is spoken. */
function timeOf(timing: NarrationTiming, starts: readonly number[], index: number): number {
  let block = 0;
  while (block + 1 < starts.length && starts[block + 1]! <= index) block++;
  const at = timing.blocks[block]?.at ?? [];
  return at[Math.min(Math.max(index - starts[block]!, 0), at.length - 1)] ?? 0;
}

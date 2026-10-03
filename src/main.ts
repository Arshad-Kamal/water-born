import { loadManifest } from './assets.ts';
import { Mixer } from './audio/mixer.ts';
import { Director } from './director.ts';
import { Backdrop } from './engine/backdrop.ts';
import { Book } from './engine/book3d.ts';
import { Cinema } from './engine/cinema.ts';
import { FONT_FACES } from './engine/pages.ts';
import { Particles } from './engine/particles.ts';
import { CoverReflection } from './engine/reflection.ts';
import { Stage } from './engine/stage.ts';
import { onTick } from './engine/ticker.ts';
import { attachInput } from './input.ts';
import { PAPER_LEAVES, Surfaces } from './surfaces.ts';
import { loader, startScreen } from './ui/hud.ts';

/** Page text is painted onto canvases, so the fonts must be ready first; give up waiting after this. */
const FONT_TIMEOUT_MS = 6000;

function element(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing from index.html`);
  return el;
}

async function loadFonts(): Promise<void> {
  const fonts = Promise.all(FONT_FACES.map((face) => document.fonts.load(face)));
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
  await Promise.race([fonts.then(() => undefined), timeout]).catch((e: unknown) => console.warn('fonts', e));
}

function showFailure(host: HTMLElement): void {
  const note = document.createElement('div');
  note.className = 'failure';
  note.textContent = 'This book needs a browser with 3D graphics (WebGL) turned on.';
  host.append(note);
}

async function boot(): Promise<void> {
  const app = element('app');
  const ui = element('ui-layer');
  const fx = element('fx-layer');
  const progress = loader(ui);

  let stage: Stage;
  try {
    stage = new Stage(app);
  } catch (e) {
    console.error(e);
    progress.done();
    showFailure(ui);
    return;
  }
  const mixer = new Mixer();
  void mixer.preload(['page-turn', 'book-open']);

  await Promise.all([loadFonts(), loadManifest()]);
  progress.progress(0.5);

  const surfaces = new Surfaces(stage.renderer.capabilities.getMaxAnisotropy());
  const book = new Book(PAPER_LEAVES, surfaces.source, surfaces.coverBoard, surfaces.endpaperMaterial(), surfaces.plain);
  stage.scene.add(book.group);
  const particles = new Particles(stage.scene, stage.lite);
  const backdrop = new Backdrop(stage.camera);
  const cinema = new Cinema(stage.camera);
  const director = new Director({ stage, book, mixer, surfaces, particles, backdrop, cinema, app, fx, ui, captions: element('captions') });

  onTick((dt, time) => {
    book.update(dt);
    director.update(dt, time);
    particles.update(dt, time, stage.pointScale);
    backdrop.update(dt);
    cinema.update();
  });
  attachInput(stage.renderer.domElement, director, book);
  stage.start();

  // The cover is what the start screen shows; wait for it so the book never appears blank.
  const reflection = new CoverReflection(stage.scene, book, await surfaces.coverTexture());
  progress.progress(1);
  progress.done();
  startScreen(ui, (voice) => {
    // iOS only lets audio start inside the tap itself, so unlock and start the music synchronously.
    mixer.unlock();
    mixer.setMusic('theme');
    reflection.fadeOut();
    director.begin(voice);
  });
}

void boot();

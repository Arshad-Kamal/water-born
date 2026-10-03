import { book } from '../content/book.ts';

const ICON = {
  voice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>',
  contents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
};

export interface Chapter {
  readonly number: number;
  readonly name: string;
  /** Index into book.pages of the chapter's first page. */
  readonly firstPage: number;
}

/** Chapters, read from the story's own chapter headings. */
export const CHAPTERS: readonly Chapter[] = book.pages.flatMap((page, i) =>
  page.blocks
    .filter((b) => b.kind === 'chapter')
    .map((b, n) => {
      const [, num = String(n + 1), name = b.text] = /^Chapter (\d+):\s*(.*)$/.exec(b.text) ?? [];
      return { number: Number(num), name, firstPage: i };
    }),
);

export function chapterOf(pageIndex: number): Chapter {
  return [...CHAPTERS].reverse().find((c) => pageIndex >= c.firstPage) ?? CHAPTERS[0]!;
}

export interface HudActions {
  toggleVoice(): void;
  togglePause(): void;
  goToPage(pageIndex: number): void;
  goToStart(): void;
}

export class Hud {
  private readonly root = document.createElement('div');
  private readonly label = document.createElement('div');
  private readonly segments: HTMLButtonElement[] = [];
  private readonly voiceBtn: HTMLButtonElement;
  private readonly pauseBtn: HTMLButtonElement;
  private readonly menu = document.createElement('div');

  constructor(host: HTMLElement, actions: HudActions) {
    this.root.className = 'hud hidden';
    this.label.className = 'chapter';
    const track = document.createElement('div');
    track.className = 'track';
    book.pages.forEach((_page, i) => {
      const seg = document.createElement('button');
      seg.setAttribute('aria-label', `Go to page ${i + 1}`);
      if (i > 0 && CHAPTERS.some((c) => c.firstPage === i)) seg.classList.add('ch');
      seg.addEventListener('click', () => actions.goToPage(i));
      this.segments.push(seg);
      track.append(seg);
    });
    const button = (icon: string, label: string, onClick: () => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.innerHTML = icon;
      b.setAttribute('aria-label', label);
      b.title = label;
      b.addEventListener('click', onClick);
      return b;
    };
    this.voiceBtn = button(ICON.voice, 'Narration', actions.toggleVoice);
    this.pauseBtn = button(ICON.pause, 'Pause', actions.togglePause);
    const contents = button(ICON.contents, 'Contents', () => this.menu.classList.toggle('hidden'));
    const buttons = [this.voiceBtn, this.pauseBtn, contents];
    if (document.fullscreenEnabled) {
      buttons.push(button(ICON.fullscreen, 'Full screen', () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      }));
    }
    this.root.append(this.label, track, ...buttons);

    this.menu.className = 'contents hidden';
    const entry = (small: string, text: string, go: () => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.innerHTML = `<small>${small}</small>`;
      b.append(text);
      b.addEventListener('click', () => {
        this.menu.classList.add('hidden');
        go();
      });
      return b;
    };
    this.menu.append(entry('Beginning', 'Title page', actions.goToStart));
    for (const c of CHAPTERS) this.menu.append(entry(`Chapter ${c.number}`, c.name, () => actions.goToPage(c.firstPage)));
    host.append(this.root, this.menu);
  }

  show(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
    if (!visible) this.menu.classList.add('hidden');
  }

  setPage(pageIndex: number | undefined): void {
    const chapter = chapterOf(pageIndex ?? 0);
    this.label.innerHTML = pageIndex === undefined ? 'Water Born' : `Chapter ${chapter.number}<em>${chapter.name}</em>`;
    this.segments.forEach((seg, i) => {
      seg.classList.toggle('done', pageIndex !== undefined && i < pageIndex);
      seg.classList.toggle('now', i === pageIndex);
    });
  }

  setVoice(on: boolean): void {
    this.voiceBtn.classList.toggle('on', on);
    this.voiceBtn.setAttribute('aria-pressed', String(on));
  }

  setPaused(paused: boolean): void {
    this.pauseBtn.innerHTML = paused ? ICON.play : ICON.pause;
    this.pauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  }
}

export function startScreen(host: HTMLElement, onChoose: (voice: boolean) => void): HTMLElement {
  const el = document.createElement('div');
  el.className = 'start';
  el.innerHTML = `
    <div class="row">
      <button class="choice primary" data-voice="1">${ICON.voice}Read to me</button>
      <button class="choice secondary" data-voice="0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5v13"/></svg>I'll read myself</button>
    </div>
    <div class="hint">Turn the sound up. Tap, swipe or drag a page corner to turn.</div>`;
  for (const b of el.querySelectorAll<HTMLButtonElement>('button')) {
    b.addEventListener('click', () => {
      el.classList.add('gone');
      onChoose(b.dataset.voice === '1');
    }, { once: true });
  }
  host.append(el);
  return el;
}

export function loader(host: HTMLElement): { progress(p: number): void; done(): void } {
  const el = document.createElement('div');
  el.className = 'loader';
  el.innerHTML = '<div><div class="drop"><div class="fill"></div></div><p>Filling the river…</p></div>';
  host.append(el);
  return {
    progress: (p) => el.style.setProperty('--p', String(p)),
    done: () => {
      el.classList.add('done');
      setTimeout(() => el.remove(), 900);
    },
  };
}

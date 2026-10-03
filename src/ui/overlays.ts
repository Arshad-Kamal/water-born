import { TEAM } from '../content/scenes.ts';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A sound word bursting off the page, e.g. "Boom!". Tapping it replays its cue. A new one knocks out the last. */
export function punch(host: HTMLElement, text: string, at: Point, water: boolean, onTap: () => void): void {
  for (const old of host.querySelectorAll('.punch')) old.classList.add('leave');
  const el = document.createElement('button');
  el.className = `punch${water ? ' water' : ''}`;
  el.textContent = text;
  el.style.left = `${at.x}px`;
  el.style.top = `${at.y}px`;
  el.style.setProperty('--r', `${(Math.random() - 0.5) * 12}deg`);
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onTap();
  });
  el.addEventListener('animationend', () => el.remove());
  host.append(el);
}

/** The five heroes as cards fanned over the picture page; each lights up as its name is read. */
export class Cards {
  private readonly root = document.createElement('div');
  private readonly cards: HTMLElement[] = [];

  constructor(host: HTMLElement, images: readonly (string | undefined)[], onFlip: () => void) {
    this.root.className = 'cards';
    TEAM.forEach((member, i) => {
      const card = document.createElement('button');
      card.className = 'card';
      card.style.setProperty('--c', member.colour);
      card.innerHTML = `<div class="inner"><div class="face front" data-name="${member.name}"></div><div class="face back"><b>${member.name}</b><span>${member.power}</span></div></div>`;
      const front = card.querySelector<HTMLElement>('.front')!;
      if (images[i]) front.style.setProperty('--img', `url("${images[i]}")`);
      card.addEventListener('pointerdown', (e) => e.stopPropagation());
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.toggle('flipped');
        onFlip();
      });
      this.cards.push(card);
      this.root.append(card);
    });
    host.append(this.root);
  }

  /** Fans the cards around a centre point; `width` is the space they may use. */
  place(center: Point, width: number): void {
    this.root.style.transform = `translate(${center.x}px, ${center.y}px)`;
    const cardW = Math.min(170, width / 3.1);
    this.cards.forEach((card, i) => {
      const k = i - 2;
      card.style.setProperty('--w', `${cardW}px`);
      card.style.setProperty('--x', `${k * cardW * 0.62}px`);
      card.style.setProperty('--y', `${Math.abs(k) * cardW * 0.09}px`);
      card.style.setProperty('--r', `${k * 7}deg`);
    });
  }

  show(): void {
    requestAnimationFrame(() => this.root.classList.add('in'));
  }

  light(index: number): void {
    this.cards.forEach((c, i) => c.classList.toggle('lit', i === index));
  }

  remove(): void {
    this.root.classList.remove('in');
    setTimeout(() => this.root.remove(), 700);
  }
}

/** "One.. Two... And three!" as three water drops that fill as they are counted. */
export class Count {
  private readonly root = document.createElement('div');
  private readonly drops: HTMLButtonElement[] = [];
  private readonly prompt = document.createElement('div');

  constructor(host: HTMLElement, onTap: () => void) {
    this.root.className = 'count';
    for (const n of [1, 2, 3]) {
      const drop = document.createElement('button');
      drop.innerHTML = `<span>${n}</span>`;
      drop.setAttribute('aria-label', `Count ${n}`);
      drop.addEventListener('pointerdown', (e) => e.stopPropagation());
      drop.addEventListener('click', (e) => {
        e.stopPropagation();
        onTap();
      });
      this.drops.push(drop);
      this.root.append(drop);
    }
    this.prompt.className = 'prompt';
    this.root.append(this.prompt);
    host.append(this.root);
  }

  place(at: Point): void {
    this.root.style.left = `${at.x}px`;
    this.root.style.top = `${at.y}px`;
  }

  hit(index: number): void {
    this.drops[index]?.classList.add('hit');
  }

  setPrompt(text: string): void {
    this.prompt.textContent = text;
  }

  remove(): void {
    this.root.remove();
  }
}

/** Fires burning on the picture page that can be tapped out. */
export class Fires {
  private readonly fires: HTMLButtonElement[] = [];

  constructor(host: HTMLElement, count: number, onTap: (index: number) => void) {
    for (let i = 0; i < count; i++) {
      const fire = document.createElement('button');
      fire.className = 'fire';
      fire.setAttribute('aria-label', 'Put out the fire');
      fire.innerHTML = '<i></i><i></i><i></i>';
      fire.addEventListener('pointerdown', (e) => e.stopPropagation());
      fire.addEventListener('click', (e) => {
        e.stopPropagation();
        onTap(i);
      });
      this.fires.push(fire);
      host.append(fire);
    }
  }

  place(index: number, at: Point): void {
    const fire = this.fires[index];
    if (!fire) return;
    fire.style.left = `${at.x}px`;
    fire.style.top = `${at.y}px`;
  }

  out(index: number): boolean {
    const fire = this.fires[index];
    if (!fire || fire.classList.contains('out')) return false;
    fire.classList.add('out');
    return true;
  }

  get remaining(): number[] {
    return this.fires.flatMap((f, i) => (f.classList.contains('out') ? [] : [i]));
  }

  remove(): void {
    for (const f of this.fires) {
      f.classList.add('out');
      setTimeout(() => f.remove(), 700);
    }
  }
}

/** "Read it again" on the last spread. */
export function replayButton(host: HTMLElement, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'choice primary replay';
  button.textContent = 'Read it again';
  button.addEventListener('click', onClick, { once: true });
  host.append(button);
  return button;
}

export class TurnHint {
  private readonly el = document.createElement('div');

  constructor(host: HTMLElement) {
    this.el.className = 'turn-hint';
    host.append(this.el);
  }

  place(at: Point): void {
    this.el.style.left = `${at.x}px`;
    this.el.style.top = `${at.y}px`;
  }

  set(on: boolean): void {
    this.el.classList.toggle('on', on);
  }
}

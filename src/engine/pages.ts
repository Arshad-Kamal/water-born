// Paints every page surface onto canvases. Text pages produce two canvases: the
// ink (what the words look like) and a half-res index mask (which character each
// pixel belongs to), so a shader can ink the words in one character at a time.
import type { Block, Page } from '../content/book.ts';

export const TEX_W = 1024;
export const TEX_H = 1536;
const MASK_SCALE = 0.5;
/** Mask value for ink that is always visible (running heads, folios, ornaments). */
export const ALWAYS = 65534;

const INK = { body: '#2b1d10', chapter: '#0f4a60', sound: '#a8341a', decor: 'rgba(14,77,100,0.6)', folio: 'rgba(43,29,16,0.55)' } as const;
const FONT = { display: 'Fraunces', body: 'Alegreya' } as const;
const MARGIN_L = 158;
const MARGIN_R = 136;
const BODY_SIZE = 54;
const BODY_LEADING = 1.6;

export const FONT_FACES = [
  `400 ${BODY_SIZE}px ${FONT.body}`,
  `italic 400 46px ${FONT.body}`,
  `600 30px ${FONT.display}`,
  `800 84px ${FONT.display}`,
  `900 120px ${FONT.display}`,
  `italic 900 120px ${FONT.display}`,
];

function canvas(w = TEX_W, h = TEX_H): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

// Deterministic noise so pages look identical on every visit.
function rng(seed: number): () => number {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, strength = 1): void {
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 26; i++) {
    const dark = r() < 0.55;
    ctx.fillStyle = dark ? `rgba(92,60,22,${r() * 0.07 * strength})` : `rgba(255,250,235,${r() * 0.08 * strength})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  ctx.lineWidth = 1;
  for (let i = 0; i < 260 * strength; i++) {
    ctx.strokeStyle = `rgba(110,75,30,${0.03 + r() * 0.05})`;
    const x = r() * w;
    const y = r() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40, x + (r() - 0.5) * 70, y + (r() - 0.5) * 70);
    ctx.stroke();
  }
}

function gutterShade(ctx: CanvasRenderingContext2D, gutterOnLeft: boolean, depth = 0.4): void {
  const x0 = gutterOnLeft ? 0 : TEX_W;
  const g = ctx.createLinearGradient(x0, 0, gutterOnLeft ? 230 : TEX_W - 230, 0);
  g.addColorStop(0, `rgba(55,30,8,${depth})`);
  g.addColorStop(0.18, `rgba(80,48,16,${depth * 0.35})`);
  g.addColorStop(1, 'rgba(80,48,16,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
}

function edgeVignette(ctx: CanvasRenderingContext2D, alpha: number): void {
  const v = ctx.createRadialGradient(TEX_W / 2, TEX_H * 0.45, TEX_W * 0.45, TEX_W / 2, TEX_H / 2, TEX_W * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(105,66,22,${alpha})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
}

const paperCache = new Map<boolean, HTMLCanvasElement>();

/** Blank parchment, shaded at the spine. */
export function paper(gutterOnLeft: boolean): HTMLCanvasElement {
  const cached = paperCache.get(gutterOnLeft);
  if (cached) return cached;
  const [c, ctx] = canvas();
  ctx.fillStyle = '#efe1c0';
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  const r = rng(gutterOnLeft ? 11 : 23);
  for (let i = 0; i < 7; i++) {
    const x = r() * TEX_W;
    const y = r() * TEX_H;
    const s = ctx.createRadialGradient(x, y, 0, x, y, 120 + r() * 260);
    s.addColorStop(0, `rgba(196,150,80,${0.04 + r() * 0.05})`);
    s.addColorStop(1, 'rgba(196,150,80,0)');
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, TEX_W, TEX_H);
  }
  grain(ctx, TEX_W, TEX_H, gutterOnLeft ? 3 : 5);
  edgeVignette(ctx, 0.3);
  gutterShade(ctx, gutterOnLeft);
  paperCache.set(gutterOnLeft, c);
  return c;
}

// ---------- text pages ----------

export interface Hotspot {
  readonly block: number;
  /** UV rectangle (0..1, v up) of the block on the page. */
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
}

export interface TextLayout {
  readonly ink: HTMLCanvasElement;
  readonly mask: HTMLCanvasElement;
  /** Total characters, indexed the way narration timings are: block start + position in block text. */
  readonly total: number;
  readonly blockStarts: readonly number[];
  readonly hotspots: readonly Hotspot[];
}

interface Line {
  readonly text: string;
  /** Position of `text[0]` within the block text. */
  readonly start: number;
}

type Op = { readonly height: number; readonly draw: (top: number) => void };

class Painter {
  readonly ink: CanvasRenderingContext2D;
  readonly mask: CanvasRenderingContext2D;
  readonly inkCanvas: HTMLCanvasElement;
  readonly maskCanvas: HTMLCanvasElement;

  constructor() {
    [this.inkCanvas, this.ink] = canvas();
    [this.maskCanvas, this.mask] = canvas(TEX_W * MASK_SCALE, TEX_H * MASK_SCALE);
    this.mask.fillStyle = '#000';
    this.mask.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
  }

  markRect(x: number, y: number, w: number, h: number, index: number): void {
    const v = index + 1;
    this.mask.fillStyle = `rgb(${v >> 8},${v & 255},0)`;
    const s = MASK_SCALE;
    const pad = 3;
    const x0 = Math.floor((x - pad) * s);
    const y0 = Math.floor((y - pad) * s);
    this.mask.fillRect(x0, y0, Math.ceil((x + w + pad) * s) - x0, Math.ceil((y + h + pad) * s) - y0);
  }

  /** Draws `text` at baseline (x, y), marking each character with its index. */
  text(text: string, x: number, y: number, size: number, firstIndex: number, tracking = 0): number {
    const ctx = this.ink;
    let cursor = x;
    for (let k = 0; k < text.length; k++) {
      const ch = text[k]!;
      const w = tracking ? ctx.measureText(ch).width : ctx.measureText(text.slice(0, k + 1)).width - (cursor - x);
      if (tracking) ctx.fillText(ch, cursor, y);
      if (ch !== ' ') this.markRect(cursor, y - size * 0.95, w, size * 1.25, firstIndex === ALWAYS ? ALWAYS : firstIndex + k);
      cursor += w + tracking;
    }
    if (!tracking) ctx.fillText(text, x, y);
    return cursor - x - tracking;
  }

  measure(text: string, tracking = 0): number {
    return this.ink.measureText(text).width + tracking * Math.max(0, text.length - 1);
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, startPos: number, widthOf: (line: number) => number): Line[] {
  const lines: Line[] = [];
  let pos = startPos;
  let current = '';
  let currentStart = pos;
  for (const word of text.split(' ')) {
    const trial = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(trial).width > widthOf(lines.length)) {
      lines.push({ text: current, start: currentStart });
      current = word;
      currentStart = pos;
    } else {
      if (!current) currentStart = pos;
      current = trial;
    }
    pos += word.length + 1;
  }
  if (current) lines.push({ text: current, start: currentStart });
  return lines;
}

const CHAPTER_WORD = ['One', 'Two', 'Three'] as const;

function chapterBlock(p: Painter, block: Block, start: number): Op[] {
  const split = block.text.indexOf(': ');
  const head = split > 0 ? block.text.slice(0, split + 1) : block.text;
  const title = split > 0 ? block.text.slice(split + 2) : '';
  const ops: Op[] = [];
  const tracking = 9;
  ops.push({
    height: 70,
    draw: (top) => {
      p.ink.font = `600 30px ${FONT.display}`;
      p.ink.fillStyle = INK.chapter;
      const w = p.measure(head.toUpperCase(), tracking);
      p.text(head.toUpperCase(), (TEX_W - w) / 2 + (MARGIN_L - MARGIN_R) / 2, top + 40, 30, start, tracking);
    },
  });
  if (title) {
    p.ink.font = `800 84px ${FONT.display}`;
    const lines = wrap(p.ink, title, split + 2, () => TEX_W - MARGIN_L - MARGIN_R);
    for (const line of lines) {
      ops.push({
        height: 96,
        draw: (top) => {
          p.ink.font = `800 84px ${FONT.display}`;
          p.ink.fillStyle = INK.chapter;
          const w = p.measure(line.text);
          p.text(line.text, (TEX_W - w) / 2 + (MARGIN_L - MARGIN_R) / 2, top + 80, 84, start + line.start);
        },
      });
    }
  }
  ops.push({ height: 40, draw: (top) => ornament(p, (TEX_W + MARGIN_L - MARGIN_R) / 2, top + 20, 0.9) });
  ops.push({ height: 40, draw: () => undefined });
  return ops;
}

function soundBlock(p: Painter, block: Block, start: number, hotspots: Hotspot[], index: number): Op[] {
  const size = 120;
  return [
    {
      height: size * 1.12,
      draw: (top) => {
        p.ink.font = `italic 900 ${size}px ${FONT.display}`;
        p.ink.fillStyle = INK.sound;
        const w = p.measure(block.text, 4);
        const x = (TEX_W - w) / 2 + (MARGIN_L - MARGIN_R) / 2;
        const base = top + size * 0.92;
        p.text(block.text, x, base, size, start, 4);
        hotspots.push({ block: index, u0: x / TEX_W, u1: (x + w) / TEX_W, v0: 1 - (base + 20) / TEX_H, v1: 1 - (base - size) / TEX_H });
      },
    },
  ];
}

function bodyBlock(p: Painter, block: Block, start: number, dropCap: boolean): Op[] {
  const ctx = p.ink;
  const width = TEX_W - MARGIN_L - MARGIN_R;
  const leading = BODY_SIZE * BODY_LEADING;
  const ops: Op[] = [];
  let capWidth = 0;
  const capLines = 2;
  if (dropCap) {
    ctx.font = `900 ${Math.round(leading * capLines * 1.02)}px ${FONT.display}`;
    capWidth = ctx.measureText(block.text[0]!).width + 18;
  }
  ctx.font = `400 ${BODY_SIZE}px ${FONT.body}`;
  const body = dropCap ? block.text.slice(1) : block.text;
  const lines = wrap(ctx, body, dropCap ? 1 : 0, (n) => (dropCap && n < capLines ? width - capWidth : width));
  lines.forEach((line, n) => {
    ops.push({
      height: leading,
      draw: (top) => {
        const base = top + BODY_SIZE * 1.1;
        if (dropCap && n === 0) {
          const capSize = Math.round(leading * capLines * 1.02);
          ctx.font = `900 ${capSize}px ${FONT.display}`;
          ctx.fillStyle = INK.chapter;
          p.text(block.text[0]!, MARGIN_L - 4, base + leading * (capLines - 1) + 4, capSize * 0.78, start);
        }
        ctx.font = `400 ${BODY_SIZE}px ${FONT.body}`;
        ctx.fillStyle = INK.body;
        p.text(line.text, MARGIN_L + (dropCap && n < capLines ? capWidth : 0), base, BODY_SIZE, start + line.start);
      },
    });
  });
  ops.push({ height: leading * 0.42, draw: () => undefined });
  return ops;
}

function ornament(p: Painter, cx: number, cy: number, scale: number): void {
  const ctx = p.ink;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = INK.decor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-90, 0);
  ctx.lineTo(-30, 0);
  ctx.moveTo(30, 0);
  ctx.lineTo(90, 0);
  ctx.moveTo(0, 16);
  ctx.bezierCurveTo(-24, 16, -26, -18, -2, -18);
  ctx.bezierCurveTo(14, -18, 18, 4, 2, 4);
  ctx.bezierCurveTo(-8, 4, -9, -8, -2, -8);
  ctx.stroke();
  ctx.restore();
  p.markRect(cx - 100 * scale, cy - 26 * scale, 200 * scale, 52 * scale, ALWAYS);
}

export function layoutTextPage(page: Page, pageNumber: number, chapter: number): TextLayout {
  const p = new Painter();
  const hotspots: Hotspot[] = [];
  const blockStarts: number[] = [];
  const ops: Op[] = [];
  let index = 0;
  let afterChapter = false;
  page.blocks.forEach((block, i) => {
    blockStarts.push(index);
    if (block.kind === 'chapter') ops.push(...chapterBlock(p, block, index));
    else if (block.kind === 'sound') ops.push(...soundBlock(p, block, index, hotspots, i));
    else ops.push(...bodyBlock(p, block, index, afterChapter));
    afterChapter = block.kind === 'chapter';
    index += block.text.length + 1;
  });
  const total = index - 1;

  const hasChapter = page.blocks[0]?.kind === 'chapter';
  if (!hasChapter) {
    p.ink.font = `600 22px ${FONT.display}`;
    p.ink.fillStyle = INK.decor;
    const label = `CHAPTER ${CHAPTER_WORD[chapter - 1]!.toUpperCase()}`;
    const w = p.measure(label, 8);
    const cx = (TEX_W + MARGIN_L - MARGIN_R) / 2;
    p.text(label, cx - w / 2, 112, 22, ALWAYS, 8);
    p.ink.fillRect(cx - w / 2 - 70, 104, 46, 2);
    p.ink.fillRect(cx + w / 2 + 24, 104, 46, 2);
  }

  const height = ops.reduce((sum, op) => sum + op.height, 0);
  const areaTop = hasChapter ? 150 : 200;
  const areaBottom = TEX_H - 210;
  let top = Math.max(areaTop, areaTop + (areaBottom - areaTop - height) * (hasChapter ? 0.18 : 0.38));
  for (const op of ops) {
    op.draw(top);
    top += op.height;
  }

  ornament(p, (TEX_W + MARGIN_L - MARGIN_R) / 2, TEX_H - 150, 0.6);
  p.ink.font = `600 26px ${FONT.display}`;
  p.ink.fillStyle = INK.folio;
  const folio = String(pageNumber);
  p.text(folio, (TEX_W + MARGIN_L - MARGIN_R) / 2 - p.measure(folio) / 2, TEX_H - 92, 26, ALWAYS);

  return { ink: p.inkCanvas, mask: p.maskCanvas, total, blockStarts, hotspots };
}

// ---------- illustrated and static pages ----------

/** Full-bleed illustration on a left-hand page (spine on the right). */
export function artPage(image: CanvasImageSource | undefined, imageW: number, imageH: number, fallbackHue: string): HTMLCanvasElement {
  const [c, ctx] = canvas();
  if (image) {
    const scale = Math.max(TEX_W / imageW, TEX_H / imageH);
    const w = imageW * scale;
    const h = imageH * scale;
    ctx.drawImage(image, (TEX_W - w) / 2, (TEX_H - h) / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, TEX_H);
    g.addColorStop(0, '#0b141c');
    g.addColorStop(0.6, fallbackHue);
    g.addColorStop(1, '#090604');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX_W, TEX_H);
  }
  ctx.globalCompositeOperation = 'multiply';
  grain(ctx, TEX_W, TEX_H, 7, 0.6);
  ctx.globalCompositeOperation = 'source-over';
  edgeVignette(ctx, 0.35);
  gutterShade(ctx, false, 0.55);
  return c;
}

function goldFill(ctx: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff0bf');
  g.addColorStop(0.45, '#e2b04a');
  g.addColorStop(1, '#94661f');
  return g;
}

function centered(ctx: CanvasRenderingContext2D, text: string, y: number, tracking = 0): void {
  if (!tracking) {
    ctx.textAlign = 'center';
    ctx.fillText(text, TEX_W / 2, y);
    ctx.textAlign = 'left';
    return;
  }
  const w = [...text].reduce((s, ch) => s + ctx.measureText(ch).width, 0) + tracking * (text.length - 1);
  let x = (TEX_W - w) / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking;
  }
}

function waveEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, stroke: string | CanvasGradient): void {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.7, cy + r * 0.3);
  ctx.bezierCurveTo(cx - r * 0.3, cy + r * 0.45, cx - r * 0.05, cy + r * 0.1, cx - r * 0.05, cy - r * 0.15);
  ctx.bezierCurveTo(cx - r * 0.05, cy - r * 0.55, cx + r * 0.55, cy - r * 0.5, cx + r * 0.5, cy - r * 0.05);
  ctx.bezierCurveTo(cx + r * 0.45, cy + r * 0.25, cx + r * 0.1, cy + r * 0.25, cx + r * 0.12, cy);
  ctx.stroke();
  ctx.restore();
}

export function titlePage(author: string, title: string): HTMLCanvasElement {
  const [c, ctx] = canvas();
  ctx.drawImage(paper(true), 0, 0);
  const [first = title, ...rest] = title.toUpperCase().split(' ');
  waveEmblem(ctx, TEX_W / 2, 380, 62, 'rgba(14,77,100,0.75)');
  ctx.font = `900 150px ${FONT.display}`;
  ctx.fillStyle = '#0f4a60';
  centered(ctx, first, 660);
  ctx.font = `800 64px ${FONT.display}`;
  centered(ctx, rest.join(' '), 760, 34);
  ctx.fillStyle = 'rgba(14,77,100,0.5)';
  ctx.fillRect(TEX_W / 2 - 120, 830, 240, 2);
  ctx.font = `italic 400 54px ${FONT.body}`;
  ctx.fillStyle = '#5a3d22';
  centered(ctx, `Story by ${author}`, 940);
  return c;
}

export function creditsPage(author: string): HTMLCanvasElement {
  const [c, ctx] = canvas();
  ctx.drawImage(paper(false), 0, 0);
  waveEmblem(ctx, TEX_W / 2, 360, 48, 'rgba(14,77,100,0.7)');
  ctx.fillStyle = '#0f4a60';
  ctx.font = `800 64px ${FONT.display}`;
  centered(ctx, 'Water Born', 540);
  ctx.font = `italic 400 46px ${FONT.body}`;
  ctx.fillStyle = '#5a3d22';
  centered(ctx, `A story by ${author}`, 620);
  ctx.font = `400 36px ${FONT.body}`;
  ctx.fillStyle = 'rgba(43,29,16,0.75)';
  const lines = ['Pictures painted with ChatGPT', 'from the world James imagined.', '', 'Narration, music and sound', 'made with ElevenLabs.'];
  lines.forEach((line, i) => centered(ctx, line, 780 + i * 56));
  ctx.font = `italic 400 44px ${FONT.body}`;
  ctx.fillStyle = '#0f4a60';
  centered(ctx, 'For James, who dreamed it up.', 1220);
  return c;
}

/** Inside covers: the endpaper painting, or a painted wave pattern until it exists. */
export function endpaper(image: CanvasImageSource | undefined, size = 1024): HTMLCanvasElement {
  const [c, ctx] = canvas();
  if (image) {
    for (let y = 0; y < TEX_H; y += size) for (let x = 0; x < TEX_W; x += size) ctx.drawImage(image, x, y, size, size);
  } else {
    ctx.fillStyle = '#0d4559';
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    for (let y = -40; y < TEX_H + 80; y += 128) {
      for (let x = -40; x < TEX_W + 80; x += 128) {
        const off = (Math.round(y / 128) % 2) * 64;
        waveEmblem(ctx, x + off, y, 30, 'rgba(127,219,231,0.18)');
      }
    }
  }
  grain(ctx, TEX_W, TEX_H, 17, 0.8);
  edgeVignette(ctx, 0.45);
  return c;
}

export function leather(): HTMLCanvasElement {
  const [c, ctx] = canvas(512, 768);
  const g = ctx.createRadialGradient(170, 220, 30, 256, 384, 700);
  g.addColorStop(0, '#1d6680');
  g.addColorStop(0.55, '#0c3a4c');
  g.addColorStop(1, '#06202b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 768);
  const r = rng(29);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '120,200,220'},${r() * 0.06})`;
    ctx.beginPath();
    ctx.arc(r() * 512, r() * 768, 0.6 + r() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export function cover(art: CanvasImageSource | undefined, artW: number, artH: number, title: string, author: string): HTMLCanvasElement {
  const [c, ctx] = canvas();
  ctx.drawImage(leather(), 0, 0, TEX_W, TEX_H);
  const gold = goldFill(ctx, 0, TEX_H);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 5;
  ctx.strokeRect(34, 34, TEX_W - 68, TEX_H - 68);
  ctx.lineWidth = 2;
  ctx.strokeRect(54, 54, TEX_W - 108, TEX_H - 108);

  const plate = { x: 92, y: 380, w: TEX_W - 184, h: 920 };
  if (art) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(plate.x, plate.y, plate.w, plate.h);
    ctx.clip();
    const s = Math.max(plate.w / artW, plate.h / artH);
    ctx.drawImage(art, plate.x + (plate.w - artW * s) / 2, plate.y + (plate.h - artH * s) * 0.6, artW * s, artH * s);
    const shade = ctx.createLinearGradient(0, plate.y, 0, plate.y + plate.h);
    shade.addColorStop(0, 'rgba(0,0,0,0.25)');
    shade.addColorStop(0.2, 'rgba(0,0,0,0)');
    shade.addColorStop(0.85, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = shade;
    ctx.fillRect(plate.x, plate.y, plate.w, plate.h);
    ctx.restore();
  }
  ctx.strokeStyle = gold;
  ctx.lineWidth = 6;
  ctx.strokeRect(plate.x, plate.y, plate.w, plate.h);
  ctx.strokeStyle = '#0a2f3d';
  ctx.lineWidth = 8;
  ctx.strokeRect(plate.x - 10, plate.y - 10, plate.w + 20, plate.h + 20);
  ctx.strokeStyle = 'rgba(226,176,74,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(plate.x - 15, plate.y - 15, plate.w + 30, plate.h + 30);

  const [first = title, ...rest] = title.toUpperCase().split(' ');
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowOffsetY = 5;
  ctx.shadowBlur = 6;
  ctx.fillStyle = goldFill(ctx, 120, 280);
  ctx.font = `900 190px ${FONT.display}`;
  centered(ctx, first, 262);
  ctx.fillStyle = goldFill(ctx, 290, 345);
  ctx.font = `800 62px ${FONT.display}`;
  centered(ctx, rest.join(' '), 340, 40);
  ctx.font = `italic 400 52px ${FONT.body}`;
  ctx.fillStyle = '#ecd08e';
  centered(ctx, `Story by ${author}`, 1408);
  ctx.shadowColor = 'transparent';
  return c;
}

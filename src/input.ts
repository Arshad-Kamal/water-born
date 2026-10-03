// Taps, drags and keys on the book. Overlays (cards, fires, HUD) sit above the
// canvas and handle their own clicks, so only gestures that start on the canvas count.
import type { Book } from './engine/book3d.ts';
import type { Director } from './director.ts';

/** Pixels a pointer must travel before a press becomes a drag. */
const DRAG_START_PX = 12;
const TAP_MAX_MS = 450;
/** A drag commits past this fraction of a turn, or when flicked faster than FLICK px/ms. */
const COMMIT_AMOUNT = 0.3;
const FLICK = 0.5;

interface Press {
  readonly id: number;
  readonly x0: number;
  readonly y0: number;
  readonly t0: number;
  dir?: 1 | -1;
  span: number;
  lastX: number;
  lastT: number;
  velocity: number;
}

export function attachInput(canvas: HTMLCanvasElement, director: Director, book: Book): void {
  let press: Press | undefined;

  canvas.addEventListener('pointerdown', (e) => {
    if (press || !e.isPrimary) return;
    canvas.setPointerCapture(e.pointerId);
    press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, span: 1, lastX: e.clientX, lastT: e.timeStamp, velocity: 0 };
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x0;
    if (e.timeStamp > press.lastT) press.velocity = (e.clientX - press.lastX) / (e.timeStamp - press.lastT);
    press.lastX = e.clientX;
    press.lastT = e.timeStamp;
    if (!press.dir && Math.abs(dx) > DRAG_START_PX) {
      const dir = dx < 0 ? 1 : -1;
      if (director.canTurn(dir) && book.beginDrag(dir)) {
        press.dir = dir;
        // Dragging a page edge all the way across the spread is a full turn.
        press.span = director.spineAndPageWidth().pageWidth * 1.6;
      }
    }
    if (press.dir) book.drag((-dx * press.dir) / press.span);
  });

  const release = (e: PointerEvent, cancelled: boolean): void => {
    if (!press || e.pointerId !== press.id) return;
    const { dir, x0, y0, t0, span, velocity } = press;
    press = undefined;
    if (dir) {
      const amount = ((x0 - e.clientX) * dir) / span;
      book.endDrag(!cancelled && (amount > COMMIT_AMOUNT || -velocity * dir > FLICK));
      return;
    }
    const still = Math.hypot(e.clientX - x0, e.clientY - y0) < DRAG_START_PX;
    if (cancelled || !still || e.timeStamp - t0 > TAP_MAX_MS) return;
    const at = { x: e.clientX, y: e.clientY };
    director.tap(at, at.x >= director.spineAndPageWidth().spine.x ? 1 : -1);
  };
  canvas.addEventListener('pointerup', (e) => release(e, false));
  canvas.addEventListener('pointercancel', (e) => release(e, true));

  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') director.next();
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') director.prev();
    else return;
    e.preventDefault();
  });
}

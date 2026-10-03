// One frame clock for the whole app: the render loop drives it, tweens ride on it.
type Tick = (dt: number, time: number) => void;

const ticks = new Set<Tick>();

export function onTick(fn: Tick): () => void {
  ticks.add(fn);
  return () => ticks.delete(fn);
}

export function runTicks(dt: number, time: number): void {
  for (const fn of [...ticks]) fn(dt, time);
}

export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/** Animates k from 0 to 1 over `seconds` on the frame clock. */
export function tween(seconds: number, update: (k: number) => void, ease: (t: number) => number = easeInOutCubic): Promise<void> {
  return new Promise((resolve) => {
    let elapsed = 0;
    const stop = onTick((dt) => {
      elapsed += dt;
      const k = Math.min(1, elapsed / seconds);
      update(ease(k));
      if (k >= 1) {
        stop();
        resolve();
      }
    });
  });
}

export const wait = (seconds: number): Promise<void> => tween(seconds, () => undefined);

/** Exponential smoothing factor for a frame of length dt toward a target at `rate` per second. */
export const damp = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);

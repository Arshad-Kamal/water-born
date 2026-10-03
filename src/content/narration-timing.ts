/** Shape of public/audio/narration/<pageId>.json, written by scripts/master-audio.ts. */
export interface NarrationTiming {
  /** Length of the narration clip in seconds. */
  readonly duration: number;
  /** Per block of the page: start time (s) of each character of the block's text. */
  readonly blocks: ReadonlyArray<{ readonly at: readonly number[] }>;
}

/** How many characters of a block have been spoken by time `t` (seconds into the clip). */
/**
 * Seconds into the clip at which character `index` of the page is spoken. `starts` are the
 * blocks' start indices in the page text; an index past a block's end clamps to its last character.
 */
export function timeOf(timing: NarrationTiming, starts: readonly number[], index: number): number {
  let block = 0;
  while (block + 1 < starts.length && starts[block + 1]! <= index) block++;
  const at = timing.blocks[block]?.at ?? [];
  return at[Math.min(Math.max(index - starts[block]!, 0), at.length - 1)] ?? 0;
}

export function spokenChars(at: readonly number[], t: number): number {
  let lo = 0;
  let hi = at.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (at[mid]! <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

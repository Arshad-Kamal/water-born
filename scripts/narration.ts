import type { Page } from '../src/content/book.ts';
import type { NarrationTiming } from '../src/content/narration-timing.ts';

export interface NarrationInput {
  /** Exact text sent to ElevenLabs: direction tags + verbatim block text. */
  readonly text: string;
  /** Index in `text` where each block's verbatim text starts. */
  readonly offsets: readonly number[];
}

export interface Alignment {
  readonly characters: readonly string[];
  readonly character_start_times_seconds: readonly number[];
}

const BLOCK_SEPARATOR = '\n\n';

export function buildNarrationInput(page: Page, tags: readonly string[]): NarrationInput {
  if (tags.length !== page.blocks.length) throw new Error(`${page.id}: ${tags.length} tags for ${page.blocks.length} blocks`);
  let text = '';
  const offsets: number[] = [];
  page.blocks.forEach((block, i) => {
    if (i > 0) text += BLOCK_SEPARATOR;
    const tag = tags[i];
    if (tag) text += `${tag} `;
    offsets.push(text.length);
    text += block.text;
  });
  return { text, offsets };
}

const round = (seconds: number): number => Math.round(seconds * 1000) / 1000;

/** Maps character-level alignment back onto each block's verbatim text. */
export function toTiming(page: Page, input: NarrationInput, alignment: Alignment, duration: number): NarrationTiming {
  const spoken = alignment.characters.join('');
  if (spoken !== input.text) throw new Error(`${page.id}: alignment text does not match the request text`);
  return {
    duration: round(duration),
    blocks: page.blocks.map((block, i) => {
      const start = input.offsets[i]!;
      return { at: alignment.character_start_times_seconds.slice(start, start + block.text.length).map(round) };
    }),
  };
}

/** Plain story text around a page, for ElevenLabs request stitching. */
export function pageText(page: Page | undefined): string | undefined {
  return page?.blocks.map((b) => b.text).join(' ');
}

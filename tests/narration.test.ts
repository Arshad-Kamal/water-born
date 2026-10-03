import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { book } from '../src/content/book.ts';
import { spokenChars, type NarrationTiming } from '../src/content/narration-timing.ts';
import { DIRECTION } from '../scripts/narration-direction.ts';
import { buildNarrationInput, toTiming } from '../scripts/narration.ts';

test('every page has exactly one narration direction per block', () => {
  for (const page of book.pages) assert.equal(DIRECTION[page.id]?.length, page.blocks.length, page.id);
});

test('narration input keeps each block verbatim at its recorded offset', () => {
  for (const page of book.pages) {
    const input = buildNarrationInput(page, DIRECTION[page.id]!);
    page.blocks.forEach((block, i) => {
      const start = input.offsets[i]!;
      assert.equal(input.text.slice(start, start + block.text.length), block.text, `${page.id} block ${i}`);
    });
  }
});

test('timing maps alignment times onto block characters, skipping tags', () => {
  const page = book.pages[0]!;
  const input = buildNarrationInput(page, DIRECTION[page.id]!);
  const chars = [...input.text];
  const timing = toTiming(page, input, { characters: chars, character_start_times_seconds: chars.map((_, i) => i / 10) }, 9.87654);
  assert.equal(timing.duration, 9.877);
  assert.equal(timing.blocks[1]!.at.length, page.blocks[1]!.text.length);
  timing.blocks.forEach((block, i) => {
    assert.equal(block.at.length, page.blocks[i]!.text.length, `block ${i} length`);
    assert.equal(block.at[0], input.offsets[i]! / 10, `block ${i} starts at its offset, after its tag`);
  });
});

test('timing rejects alignment that does not match the request text', () => {
  const page = book.pages[0]!;
  const input = buildNarrationInput(page, DIRECTION[page.id]!);
  const wrong = [...input.text.replace('Water', 'Fire!')];
  assert.throws(() => toTiming(page, input, { characters: wrong, character_start_times_seconds: wrong.map(() => 0) }, 1), /does not match/);
});

test('spokenChars counts characters whose start time has passed', () => {
  const at = [0, 0.1, 0.2, 0.3];
  assert.equal(spokenChars(at, -1), 0);
  assert.equal(spokenChars(at, 0.15), 2);
  assert.equal(spokenChars(at, 0.2), 3, 'a character starting exactly now counts as spoken');
  assert.equal(spokenChars(at, 5), 4);
});

test('committed narration timings match the current page text', () => {
  for (const page of book.pages) {
    const timing = JSON.parse(readFileSync(new URL(`../public/audio/narration/${page.id}.json`, import.meta.url), 'utf8')) as NarrationTiming;
    assert.deepEqual(timing.blocks.map((b) => b.at.length), page.blocks.map((b) => b.text.length), `${page.id}: re-run audio:master (or regenerate narration) after changing its text`);
  }
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { book } from '../src/content/book.ts';

const TITLE_PREFIX = 'Story Title: ';

// Formatting in the source (emphasis asterisks, section rules, line breaks) is
// presentation, not story; everything else must match character for character.
function normalize(raw: string): string {
  return raw
    .replace(/^---$/gm, '')
    .replaceAll('*', '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readOriginal(): { title: string; body: string } {
  const source = readFileSync(new URL('../docs/story-original.md', import.meta.url), 'utf8');
  const [titleLine = '', ...rest] = source.replace(/<!--[\s\S]*?-->/g, '').trim().split('\n');
  assert.ok(titleLine.startsWith(TITLE_PREFIX), 'story-original.md must start with the title line');
  return { title: titleLine.slice(TITLE_PREFIX.length).trim(), body: normalize(rest.join('\n')) };
}

const original = readOriginal();

test('book title matches the original story title', () => {
  assert.equal(book.title, original.title);
});

test('book pages reproduce the original story word for word', () => {
  const bookBody = normalize(book.pages.flatMap((page) => page.blocks.map((block) => block.text)).join(' '));
  assert.equal(bookBody, original.body);
});

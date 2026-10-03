import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { book } from '../src/content/book.ts';
import { SCENES, TEAM } from '../src/content/scenes.ts';
import { MUSIC, SFX } from '../src/content/sound.ts';

const pageText = (blocks: readonly { text: string }[]): string => blocks.map((b) => b.text).join(' ');

test('every page has a scene', () => {
  for (const page of book.pages) assert.ok(SCENES[page.scene], `${page.id} scene ${page.scene}`);
});

test('every cue phrase appears verbatim on its page', () => {
  for (const page of book.pages) {
    for (const cue of SCENES[page.scene]?.cues ?? []) assert.ok(pageText(page.blocks).includes(cue.phrase), `${page.id}: "${cue.phrase}"`);
  }
});

test('every referenced sound has a mastered file', () => {
  for (const scene of Object.values(SCENES)) {
    const ids = [...scene.ambience, ...(scene.enter ? [scene.enter] : []), ...(scene.cues ?? []).flatMap((c) => (c.sfx ? [c.sfx] : []))];
    for (const id of ids) {
      assert.ok(id in SFX, id);
      assert.ok(existsSync(new URL(`../public/audio/sfx/${id}.mp3`, import.meta.url)), `missing sfx ${id}`);
    }
    assert.ok(existsSync(new URL(`../public/audio/music/${scene.music}.mp3`, import.meta.url)), `missing music ${scene.music}`);
  }
  assert.ok(Object.keys(MUSIC).length > 0);
});

test('team cards name exactly the five heroes in the order the story introduces them', () => {
  const intro = book.pages.find((p) => p.scene === 'team-intro')!;
  const text = pageText(intro.blocks);
  const positions = TEAM.map((m) => text.indexOf(m.name));
  assert.ok(positions.every((p) => p >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

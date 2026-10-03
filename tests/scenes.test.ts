import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { blockStarts, book, pageText } from '../src/content/book.ts';
import { CARDS_PHRASE, COUNT_WORDS, FIRES_OUT_PHRASE, SCENES, TEAM } from '../src/content/scenes.ts';
import { MUSIC, SFX } from '../src/content/sound.ts';

const sceneText = (scene: string): string => pageText(book.pages.find((p) => p.scene === scene)!);

test('every page has a scene', () => {
  for (const page of book.pages) assert.ok(SCENES[page.scene], `${page.id} scene ${page.scene}`);
});

test('block starts index each block inside the joined page text', () => {
  for (const page of book.pages) {
    const text = pageText(page);
    blockStarts(page).forEach((start, i) => assert.equal(text.slice(start, start + page.blocks[i]!.text.length), page.blocks[i]!.text, `${page.id} block ${i}`));
  }
});

test('every cue phrase appears verbatim on its page', () => {
  for (const page of book.pages) {
    for (const cue of SCENES[page.scene]?.cues ?? []) assert.ok(pageText(page).includes(cue.phrase), `${page.id}: "${cue.phrase}"`);
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
  const text = sceneText('team-intro');
  const positions = TEAM.map((m) => text.indexOf(m.name));
  assert.ok(positions.every((p) => p >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(text.indexOf(CARDS_PHRASE) >= 0 && text.indexOf(CARDS_PHRASE) < positions[0]!, 'cards appear before the first name');
});

test('the fires go out on a phrase of the last-fire page', () => {
  assert.ok(sceneText('last-fire').includes(FIRES_OUT_PHRASE));
});

test('count words appear once each, in order, on the vine-leap page', () => {
  const text = sceneText('vine-leap');
  const positions = COUNT_WORDS.map((w) => text.indexOf(w));
  assert.ok(positions.every((p, i) => p >= 0 && text.lastIndexOf(COUNT_WORDS[i]!) === p), positions.join());
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

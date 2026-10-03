# Review: Water Born audio pipeline, Tests lens

2026-10 · `5d2660f..2c72c55` (commit 2c72c55). Files: `scripts/gen-audio.ts`, `scripts/master-audio.ts`, `scripts/narration.ts`, `scripts/narration-direction.ts`, `src/content/sound.ts`, `src/content/narration-timing.ts`, `tests/narration.test.ts`, and the `audio:*` scripts in `package.json`.

## Verdict

I read the alignment→timing mapping in full and it is correct today. `buildNarrationInput` records each block's offset after the separator and tag are appended (`scripts/narration.ts:23-27`). `toTiming` first checks that the alignment text equals the request text, then slices the alignment at those offsets (`scripts/narration.ts:36-42`). The story text is ASCII-only, so string indices and alignment indices line up.

The weakness is in the tests that guard this mapping. The timing test would still pass if every block after the first got the wrong times. Nothing ties the committed timing JSON to `book.ts`. The mismatch test accepts any thrown error. All findings are minor. None is a current defect in production behaviour.

## Findings

### Minor

**1. The timing test can't catch wrong offsets for blocks after the first.** `tests/narration.test.ts:27-29`
- **Issue:** The test checks three things: the rounded duration, that `blocks[1].at.length` equals the block's text length, and the first time in block 0. It never checks *which* times block 1 receives.
- **Evidence:** Suppose `toTiming` (`scripts/narration.ts:41`) used `input.offsets[0]` for every block, or an off-by-one start for `i > 0` (for example, forgetting the `'\n\n'` separator). The test still passes. `slice(start, start + len)` returns `len` elements whenever enough characters follow, and block 0 is unaffected. The "skipping tags" in the test name is only verified for block 0.
- **Fix:** Loop over every page and block and compare the whole array: `assert.deepEqual(timing.blocks[i].at, Array.from({length: block.text.length}, (_, k) => (input.offsets[i] + k) / 10))`. Add one synthetic page whose tags include `''` to cover the untagged branch at `scripts/narration.ts:25`, which the real `DIRECTION` data never hits.

**2. No test ties the committed timings and real alignments to `book.ts`.** `tests/narration.test.ts` (absent); producers at `scripts/master-audio.ts:71-73`
- **Issue:** `public/audio/narration/<id>.json` and `audio-src/narration/<id>.alignment.json` are committed. Page breaks and block kinds are editorial and may change (root `AGENTS.md`, Conventions). If they change, the timings go stale, and `npm run verify` stays green until someone reruns `audio:master` (which needs ffmpeg).
- **Second gap:** `spokenChars` (`src/content/narration-timing.ts:11-19`) is a binary search, so it assumes each `at` array is non-decreasing. Nothing checks that real ElevenLabs output meets this.
- **Fix:** Add one credit-free test that, for each page:
  - loads the committed alignment;
  - runs `toTiming(page, buildNarrationInput(page, DIRECTION[page.id]), alignment, 0)`;
  - `deepEqual`s the result's `blocks` against the committed public JSON;
  - asserts each `at` is non-decreasing.

  This also exercises the mapping against real API output, not only synthetic data.

**3. The mismatch test accepts any error.** `tests/narration.test.ts:35`
- **Issue:** `assert.throws(() => toTiming(...))` has no matcher. Any exception passes, including a `TypeError` from some unrelated regression.
- **Weak fixture:** The fixture `['x']` differs from the request in length too, so it doesn't model the realistic failure: same-length text that differs in content, or the API returning the text without the tags.
- **Fix:** Pass `/does not match the request text/` as the matcher. Use a fixture that has the request's length but differs in one character, or that omits the tags.

**4. The `spokenChars` test skips the exact-boundary case.** `tests/narration.test.ts:38-43`
- **Issue:** The behaviour of `at[mid] <= t` (`src/content/narration-timing.ts:15`) at `t` equal to a start time is unpinned. If someone changes `<=` to `<`, every case in the test still passes.
- **Fix:** Add `assert.equal(spokenChars(at, 0.1), 2)` and `assert.equal(spokenChars([], 1), 0)`.

**5. A comment points to a test file that doesn't exist.** `scripts/narration-direction.ts:3`
- **Issue:** The comment says `tests/narration-direction.test.ts` checks one entry per block. That file doesn't exist. The check lives at `tests/narration.test.ts:8-10`, so a reader looking for the coverage is sent to the wrong place.
- **Fix:** Point the comment at `tests/narration.test.ts`.

### Info

- **`gen-audio.ts` has no tests, which is a reasonable choice.** The credit-protection skips (`scripts/gen-audio.ts:40`, `:60`, `:78`) are one-line `existsSync` checks inside a top-level side-effecting script. Testing them would mean extracting a seam, which isn't worth it at this size. The narration tags are validated before the paid call, because `buildNarrationInput` throws on a tag/block count mismatch, and `tests/narration.test.ts:8-10` covers the real data.
- **Loudness logic is only checked by hand.** `master-audio.ts` has no tests for its gain clamp or its loop/SFX/music target selection (`scripts/master-audio.ts:42`, `:61`). Both need ffmpeg and real files, so that's acceptable.

## Open questions

- `scripts/master-audio.ts:44`: the brief says one static gain with "no dynamic compression", but every file also goes through `alimiter=limit=0.89`. Is a peak limiter intentionally allowed? On loops it could, in principle, change gain near the loop seam if it ever engages. The target for loops is -26 LUFS, so it probably never does.
- `scripts/master-audio.ts:73`: `duration` is measured on the re-encoded MP3. LAME adds encoder delay and padding, which shifts the audio by roughly 25 ms relative to the source alignment times unless the decoder honours the gapless header. Is that offset acceptable for the ink reveal? It is almost certainly below perception.

## What I did not review

- The contents of the generated MP3 and JSON files, as instructed.
- Lenses other than Testing. I noticed two items outside this lens but did not chase them:
  - `src/content/narration-timing.ts:1` says the JSON is "written by scripts/gen-audio.ts". It is actually written by `scripts/master-audio.ts:73`.
  - `gen-audio.ts:40` regenerates a narration page whose MP3 exists but whose alignment file is missing, which overwrites a paid file. This only happens after a crash between two synchronous writes, so the risk is low.
- I did not run `npm test` or `verify`; this was a read-only review.
- `tests/scenes.test.ts` (which checks that SFX and music files exist) arrives in a later commit (9f5fa44), outside this range.

# Review: Water Born audio pipeline, readability and maintainability

2026-05-xx · `git diff 5d2660f..2c72c55` (commit 2c72c55): `scripts/gen-audio.ts`, `scripts/master-audio.ts`, `scripts/narration.ts`, `scripts/narration-direction.ts`, `src/content/sound.ts`, `src/content/narration-timing.ts`, `tests/narration.test.ts`, `package.json`

## Verdict

The pipeline is small, well split and easy to follow. Functions are short, nesting is shallow, and `src/content/sound.ts` is the one home for prompts and ids. Within the maintainability lens, two comments point at the wrong file. That is the most concrete problem, because the project treats a stale comment as worse than none. The rest is minor: the request-text derivation is written out in two places, the mastering loop is driven by the directory rather than the catalogue, and one timing test only checks the first block's offset. No major or critical issues were found in this lens.

## Findings

### Minor

**1. Stale comment: names a test file that does not exist.** `scripts/narration-direction.ts:3`
- **Issue:** The comment says `tests/narration-direction.test.ts checks every page has exactly one entry per block.` The tests folder only has `narration.test.ts`, `scenes.test.ts` and `story-verbatim.test.ts`. The check is actually `tests/narration.test.ts:8-10` ("every page has exactly one narration direction per block").
- **Fix:** Point the comment at `tests/narration.test.ts`.

**2. Stale comment: names the wrong writer of the timing JSON.** `src/content/narration-timing.ts:1`
- **Issue:** The doc comment says the JSON is "written by scripts/gen-audio.ts". It is actually written by `scripts/master-audio.ts:73` (`writeFileSync(new URL(`${page.id}.json`, narrationOut), …toTiming(…))`). `gen-audio.ts` only writes `audio-src/narration/<id>.alignment.json`. Someone debugging the timing could open the wrong script, and the wrong one spends credits.
- **Fix:** Change the comment to `scripts/master-audio.ts`.

**3. The request text is derived in two places.** `scripts/gen-audio.ts:42` and `scripts/master-audio.ts:72`
- **Issue:** Both lines are `buildNarrationInput(page, DIRECTION[page.id] ?? [])`. The mapping only works if mastering rebuilds exactly the text that was sent to ElevenLabs (`toTiming` throws otherwise, at `scripts/narration.ts:37`). That fact currently has two homes, so a future change to how tags are chosen (a default tag, say) has to be made in both.
- **Fix:** Add `narrationInputFor(page)` to `scripts/narration.ts` and call it from both scripts. The test can keep calling `buildNarrationInput` directly.

**4. Mastering loops over the directory instead of the catalogue.** `scripts/master-audio.ts:56-65`
- **Issue:** SFX and music mastering iterate `readdirSync(src)` and work out the id with `file.replace('.mp3', '')`. Loop status comes from a separately built `loops` Set (line 56), and the target comes from a nested ternary (line 63). Narration, a few lines below (lines 69-74), iterates `book.pages` instead. Because of the directory loop:
  - a renamed or removed id in `sound.ts` still gets mastered and shipped from its leftover original;
  - a catalogue id with no original is silently skipped instead of failing.
- **Fix:** Iterate `Object.entries(SFX)` and `Object.entries(MUSIC)` the way narration iterates pages, and derive the target from `spec` directly. This removes the `loops` Set, the string-replace and the nested ternary, and a missing original then fails loudly in ffmpeg.

**5. The loop narrowing is duplicated.** `scripts/gen-audio.ts:64` and `scripts/master-audio.ts:56`
- **Issue:** `'loop' in spec ? spec.loop : false` and `'loop' in spec && spec.loop` are two hand-written ways of reading the same optional field. They exist only because `Object.entries` on an `as const` object yields a union in which some members have no `loop`.
- **Fix:** Type the entries as the declared spec, e.g. `Object.entries<SfxSpec>(SFX)`, so `spec.loop ?? false` type-checks. This fits naturally with finding 4.

**6. The timing test only checks the first block's start offset.** `tests/narration.test.ts:27-28`
- **Issue:** Block 1 gets a length check (line 27), and the time check (line 28) covers block 0 only. The `\n\n` separator and the second tag sit in front of block 1, and no assertion covers that offset. If the offset bookkeeping in `buildNarrationInput` (`scripts/narration.ts:22-27`) went wrong by the separator length, the at-array would still be the right length but its values would be shifted, and the current assertions would not catch it.
- **Fix:** Loop over every block and assert `timing.blocks[i].at[0] === input.offsets[i] / 10` and `at.length === block.text.length`. Use a page with three blocks (e.g. `p02`) so both a separator and a tag sit between blocks.

**7. Log and error paths are inconsistent and URL-encoded.** `scripts/master-audio.ts:24,28,35,45`
- **Issue:** Error messages use `file.pathname`, which percent-encodes the space in `Pi Projects` (`Pi%20Projects`). The success log slices `out.pathname.split('/audio/')[1]`. Meanwhile the file already defines a `path()` helper (line 20) that produces the decoded filesystem path. The name `path` also reads like the `node:path` module.
- **Fix:** Use the helper in messages, and consider renaming it to `fsPath` (or similar).

## Open questions

- `scripts/gen-audio.ts:41`: re-running skips a page only when both the mp3 and the alignment file exist. If the process dies between the two `writeFileSync` calls (lines 50-51), the paid mp3 is overwritten by a new paid request. Was this half-written state accepted deliberately? Writing the alignment first, or skipping on the mp3 alone, would avoid the second charge. This sits in the failure-behaviour lens, so it is raised here and not asserted.
- `tests/narration.test.ts:24` splits the text with `[...input.text]` (code points), while `toTiming` indexes with UTF-16 offsets. That only diverges for astral characters. Can the story text ever contain one, such as an emoji? If not, there is nothing to do.

## What I did not review

The other lenses (logic and edge cases, security, failure handling, performance) were outside this focused readability and maintainability pass. I only flagged items from them that I came across. I did not check the ElevenLabs request shapes, model ids, the voice id, or whether the alignment returned by `eleven_v4` includes the tag characters against current API docs. I did not review the generated mp3/json under `audio-src/` and `public/audio/`, the browser consumer `src/audio/mixer.ts`, or `docs/stack-notes.md`. Nothing was executed: no tests, typecheck or ffmpeg run, because my access was read-only.

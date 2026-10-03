# Review: Water Born audio generation and mastering pipeline (logic and edge cases)

2026-10 · `5d2660f..2c72c55` (commit 2c72c55): `scripts/gen-audio.ts`, `scripts/master-audio.ts`, `scripts/narration.ts`, `scripts/narration-direction.ts`, `src/content/sound.ts`, `src/content/narration-timing.ts`, `tests/narration.test.ts`, `package.json` audio scripts

## Verdict

The alignment-to-timing mapping is correct. `buildNarrationInput` records each block's offset after the tag and the `\n\n` separator. `toTiming` refuses alignment whose joined characters differ from the request text. Because the story and tags are pure ASCII (no non-ASCII matches in `src/content/book.ts`), one alignment entry equals one UTF-16 index, so slicing by `offsets[i]` and `block.text.length` is exact. The committed `p05.json` has 34 `at` entries for a 34-character block, which agrees. The secret handling is sound: the key is never logged, `.env` is gitignored, and the error text contains only the response body.

The main defect is in mastering. The `alimiter` stage uses ffmpeg's default `latency=false`. Going by the ffmpeg filter documentation (I could not run ffmpeg to confirm), that setting shifts every output by the 5 ms attack lookahead and drops the last 5 ms. That puts a small gap at every loop seam, which defeats the "loops stay seamless" goal. The generation script also has a smaller problem: a narration page left half-written gets paid for a second time, and its paid mp3 is overwritten.

## Findings

### Major

**M1. `alimiter` without latency compensation shifts every file by about 5 ms and cuts the tail, so loops lose their seams.**
- **Location:** `scripts/master-audio.ts:41`, the filter `volume=…dB,alimiter=limit=0.89:level=false`.
- **Issue:** ffmpeg's `alimiter` keeps a lookahead buffer the length of `attack` (5 ms by default). Its `latency` option defaults to false. The ffmpeg docs say `latency` compensates the lookahead delay and flushes the buffer at EOF. With it off, the output therefore starts with about 5 ms of delay (silence) and the last 5 ms of real audio never reaches the output.
- **Effect:** for the `*-loop` SFX this inserts a short dropout or click every time the loop wraps. That is the failure the header comment (`master-audio.ts:2-3`) says the design avoids. A limiter is also dynamic gain reduction, so the code contradicts the "ONE static gain per file" intent whenever it engages.
- **Narration timing:** the delay shifts it by only 5 ms, which is negligible.
- **Fix, smallest option:** append `:latency=1` to the `alimiter` arguments.
- **Fix, more faithful option:** skip `alimiter` for `TARGET.loop` and `TARGET.music` files, where the gain is normally negative, so the result is purely static gain. Either way, check one mastered loop's sample count and seam against its source.
- **Confidence:** medium. This rests on documented ffmpeg behaviour. I did not run ffmpeg or check the installed version.

### Minor

**m1. A half-written narration page is regenerated and its paid mp3 overwritten.**
- **Location:** `scripts/gen-audio.ts:41` (skip condition) and `gen-audio.ts:50-51` (write order).
- **Causal chain:** the mp3 is written before the alignment JSON, and a page is skipped only when *both* files exist. Two cases leave just the mp3 on disk:
  - the process dies between the two writes;
  - `data.alignment` is absent, so `JSON.stringify(undefined)` makes `writeFileSync` throw.
- **Effect:** the next run pays for the page again and silently replaces a paid original. That contradicts the header comment "Existing files are never regenerated" (`gen-audio.ts:1-2`). The window is small, so this is minor.
- **Fix:** validate `data.audio_base64` and `data.alignment` before writing anything. Then skip (or throw "partial narration for pXX; delete both to redo") if *either* file exists.

**m2. The test never checks the start offset of a block after a separator.**
- **Location:** `tests/narration.test.ts:22-29`.
- **Gap:** the timing test checks block 1's *length* and block 0's first time, but not that `blocks[1].at[0] === input.offsets[1] / 10`. A wrong separator length or offset in `buildNarrationInput` would only be caught by the separate verbatim-slice test. The empty-tag branch (`if (tag)` at `narration.ts:25`) is also never exercised, because every `DIRECTION` entry is non-empty.
- **Fix:** add one `assert.equal(timing.blocks[1]!.at[0], input.offsets[1]! / 10)`, plus a case with a `''` tag.

**m3. Two comments point at the wrong file (outside this lens, noted only).**
- `src/content/narration-timing.ts:1` says the JSON is "written by scripts/gen-audio.ts". It is written by `scripts/master-audio.ts:73`.
- `scripts/narration-direction.ts:3` cites `tests/narration-direction.test.ts`, which does not exist. The check lives in `tests/narration.test.ts:8-10`.
- **Fix:** correct both paths.

## Open questions

1. `scripts/master-audio.ts:41`: is the limiter meant to apply to loops and music at all? The intent says "one static gain per file, no dynamic compression". If the limiter is only there to catch peaks on boosted SFX, should it be restricted to the `TARGET.sfx` and `TARGET.narration` cases?
2. `scripts/gen-audio.ts:47-48`: does `eleven_v4` actually honour `previous_text`/`next_text`, or does it accept and ignore them? The stack notes list both fields in the body but don't record a smoke test of stitching on v4. This changes nothing now, because all pages are already generated.

## What I did not review

- The contents of the binary or JSON outputs under `audio-src/` and `public/audio/`, apart from one spot check of `public/audio/narration/p05.json` against its block length.
- Whether the mastered loops really are seamless. I could not run ffmpeg/ffprobe or listen to the files.
- The ElevenLabs request parameters (`music_v2_5`, `loop`, `prompt_influence`, duration limits), beyond comparing them with `docs/stack-notes.md`.
- The prompt and creative content in `sound.ts` and `narration-direction.ts`.
- How the future reader engine will consume `spokenChars`. It isn't built yet.
- Readability, performance and security beyond the key-handling path. Those belong to other review lenses.

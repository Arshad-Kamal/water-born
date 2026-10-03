# Review: audio generation and mastering pipeline, error handling and correctness lens

2026-10-03 · `5d2660f..2c72c55` (commit `2c72c55`): `scripts/gen-audio.ts`, `scripts/master-audio.ts`, `scripts/narration.ts`, `scripts/narration-direction.ts`, `src/content/sound.ts`, `src/content/narration-timing.ts`, `tests/narration.test.ts`, `package.json` audio scripts

## Verdict

The pipeline is healthy. Nothing is critical or major. The alignment-to-timing mapping is correct for the current book. Each offset points past the tag and its trailing space, and past the `\n\n` separator. The slice length equals the block's verbatim text length. The joined-text check catches any drift between the request and the alignment.

Secret handling is clean. The key travels only in the `xi-api-key` header, error messages contain only the path and the response body, and `.env` is gitignored. Sequential generation with skip-on-exists means a failure part-way keeps everything already paid for.

The real defects are small:
- A narration page left half-written gets billed again and its paid mp3 overwritten.
- `toTiming` trusts the alignment array lengths without checking them.
- When ffmpeg can't be launched, the real error is masked.
- The timing test proves tag skipping only for the first block.
- Two comments are stale.

One open question needs a quick ffmpeg check: the `alimiter` step may break seamless loops.

## Findings

### Minor

**1. A half-written narration pair gets billed again and overwrites the paid mp3**
- Location: `scripts/gen-audio.ts:40`, `scripts/gen-audio.ts:49-51`
- Issue: The skip check needs *both* files (`existsSync(mp3) && existsSync(alignmentFile)`). The mp3 is written before the alignment. Anything that throws after line 50 leaves a lone mp3: a response with a missing `alignment` makes `JSON.stringify(undefined)` return `undefined`, and `writeFileSync` then throws `ERR_INVALID_ARG_TYPE`; a disk error does the same. The next run pays for that page again and silently overwrites the existing paid mp3. That contradicts the file's own contract at lines 1-2 ("Existing files are never regenerated… delete a file by hand to redo it").
- Likelihood is low and the cost is one page of credits, so this is minor.
- Fix:
  - Before writing anything, validate the response: `audio_base64` is a non-empty string and `alignment.characters` is an array.
  - Skip when *either* file exists. A half pair then fails loudly in `audio:master` (ENOENT) and the user decides, which matches the "delete by hand to redo" rule.

**2. `toTiming` checks the joined text but not the array lengths its index slicing relies on**
- Location: `scripts/narration.ts:36-43`
- Issue: `alignment.characters.join('') === input.text` proves the text matches. It does not prove one entry per UTF-16 code unit, and it does not prove `character_start_times_seconds.length === characters.length`. Offsets come from `text.length` (UTF-16 units) and are used to index the times array.
  - If the API ever returns a multi-unit entry (a non-BMP character), or a times array shorter than the characters array, `slice` silently returns shifted or short `at` arrays.
  - A short `at` array means `spokenChars` can never reveal the block's tail.
- This is external API data persisted to disk, so the check sits at a genuine trust boundary. The current book has no non-BMP characters (grep confirmed), so this is latent.
- Fix: in the existing guard, also throw when `alignment.characters.length !== input.text.length` or `character_start_times_seconds.length !== characters.length`.

**3. `loudness()` masks an ffmpeg launch failure**
- Location: `scripts/master-audio.ts:23-24`
- Issue: When `spawnSync` cannot start ffmpeg (ENOENT, PATH changed), Node returns `status: null`, `error` set, and `stderr: null`. The `status !== 0` branch then evaluates `run.stderr.slice(-300)` and throws `TypeError: Cannot read properties of null` instead of the real ENOENT. `duration()` uses `execFileSync`, which reports ENOENT correctly, so the two helpers behave inconsistently.
- Fix: add `if (run.error) throw run.error;` before the status check.

**4. The header comment says "never dynamic compression", but the filter chain applies a peak limiter**
- Locations: `scripts/master-audio.ts:2-3` vs `scripts/master-audio.ts:43`
- Issue: The comment promises "one static gain… never dynamic compression, so seamless loops stay seamless". Line 43 applies `alimiter=limit=0.89:level=false` after the gain. `alimiter` is a dynamic gain processor with lookahead. It may be a deliberate safety stage, but the comment states otherwise. See Q1 for a possible effect on loops.
- Fix: correct the comment to say a safety peak limiter follows the static gain. Alternatively, remove or adjust the limiter per Q1.

**5. The timing test proves tag and separator skipping only for block 0**
- Location: `tests/narration.test.ts:22-30`
- Issue: The test is titled "skipping tags", but it asserts `at[0]` only for block 0. For block 1 it checks just the *length*. Suppose `toTiming` used the wrong offset for blocks after the first (for example, ignoring the `\n\n` plus tag prefix). The length check would still pass.
- Fix: replace the spot checks with an exact assertion for every block, e.g. `assert.equal(timing.blocks[i].at[0], input.offsets[i] / 10)` for each `i`, or a `deepEqual` on the full `blocks` array.

**6. Two stale comments** (outside this lane; reported once because each fix is a one-line edit)
- `scripts/narration-direction.ts:3` cites `tests/narration-direction.test.ts`, which does not exist. The check lives at `tests/narration.test.ts:8-10`.
- `src/content/narration-timing.ts:1` says the JSON is "written by scripts/gen-audio.ts". It is written by `scripts/master-audio.ts:73`.
- Fix: correct both references.

### Info

- **No retry or backoff on the paid POSTs (`scripts/gen-audio.ts:19-27`) is the right choice.** A retry after a timeout or 5xx could bill twice. Node's fetch (undici) has default 300 s header and body timeouts, so a hung request still ends. Music took about 9 s per `docs/stack-notes.md`. No change suggested.
- **The gain clamp can silently miss a target.** `MAX_GAIN_DB = 20` (`scripts/master-audio.ts:15, 41`) leaves very quiet sources well under target (raw SFX go down to -53 LUFS per stack notes). The log line shows the gain applied, not the miss. This matches the accepted count-chime case. No change suggested.
- **Secret handling is clean.** The key is read once (`gen-audio.ts:17-18`). The missing-key error does not print it. It is sent only as a header and appears in no log or error string. `.env` is in `.gitignore`. The key is not reachable from `src/`.

## Open questions

**Q1. Does `alimiter` with its default `latency=false` shift each loop by the attack lookahead?**
- Location: `scripts/master-audio.ts:43`
- My recollection of ffmpeg's `af_alimiter`: without `latency=1`, the output is delayed by the lookahead (default attack 5 ms). That would put about 5 ms of leading silence in the file and drop the last 5 ms of the source. In `*-loop.mp3` beds that would cause an audible dropout at every wrap.
- I could not run ffmpeg to confirm this.
- To check: compare the first ~10 ms of `public/audio/sfx/waterfall-loop.mp3` against `audio-src/sfx/waterfall-loop.mp3` (`astats` or a waveform).
- If confirmed, add `latency=1` or skip the limiter for loops. Loops target -26 LUFS and rarely reach 0.89 peak anyway.

**Q2. Is it intended that narration timings come from the source audio but `duration` from the re-encoded mastered file?**
- Location: `scripts/master-audio.ts:73`
- The libmp3lame re-encode adds encoder delay (about 25 ms), so character times and the served file can differ by that much. This is likely negligible for the text reveal.

## What I did not review

- The contents of the binary or generated files under `audio-src/` and `public/audio/` (excluded by scope).
- I ran no tests, typecheck, ffmpeg or the API. The tool set is read-only and without a shell, so the ffmpeg behaviours in Q1 and finding 3 come from code reading and known Node/ffmpeg semantics, not execution.
- `src/content/book.ts`, apart from the `Page`/`Block` types and a non-BMP character grep.
- The other tests (`scenes.test.ts`, `story-verbatim.test.ts`) and the docs and plan edits in the diff, beyond checking them for facts the scripts depend on.
- Prompt quality and audio aesthetics.

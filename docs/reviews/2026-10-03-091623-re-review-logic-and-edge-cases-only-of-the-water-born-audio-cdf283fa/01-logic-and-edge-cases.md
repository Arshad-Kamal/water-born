# Re-review: Water Born audio mastering fix (logic and edge cases)

2026-10-03 · `2c72c55..b31c3ce`, audio-mastering changes only: `scripts/master-audio.ts`, `scripts/narration-direction.ts`, `src/content/narration-timing.ts`, `tests/narration.test.ts`

## Verdict

The fix for the earlier major finding (M1) is correct and covers both parts of it. Loops and music now get a pure `volume=` filter with no `alimiter`, which was the "more faithful" option the earlier review suggested. Narration and one-shot SFX keep the limiter, now with `latency=true`. I found no new logic defects in the changed lines. The `-inf` peak parsing, the order of the gain clamps, and the choice of which files skip the limiter all behave as intended.

## Findings

### Info

**I1. "≤ −1 dBTP" holds for the signal before encoding, not for the finished file.** `scripts/master-audio.ts:47`
- The cap uses the source's true peak, which `ebur128` reports at 0.1 dB precision. The gain is then rounded with `toFixed(2)`, and the file is re-encoded to 128k MP3. Each step can move the final true peak a few hundredths of a dB, and the MP3 encode can add a fraction of a dB of overshoot. So a file sitting right at the cap can measure slightly above −1 dBTP. It still stays below 0 dBFS, and absorbing encoder overshoot is the reason for a −1 dB ceiling in the first place.
- No change recommended. This only matters if someone checks the output against a strict ≤ −1 dBTP limit.

## What I checked

- **The fix is complete.** The `staticOnly` filter is exactly `volume=${gain}dB` (`master-audio.ts:48`). The limiter path appends `:latency=true`, which is the delay compensation M1 asked for. `staticOnly` is set to `kind === 'music' || isLoop` for SFX and music (`:69`) and to `false` for narration (`:77`).
- **Which files are static-only.** The `loops` set (`:60`) is built from SFX entries with `loop: true`. All 8 `*-loop` ids in `src/content/sound.ts` have it, and there are 8 `*-loop.mp3` outputs. Every music file is static-only, every one-shot goes through the limiter. That matches the intent.
- **Peak parsing.** The summary is taken from the last `Summary:` (`:29`), so per-frame `TPK`/`FTPK` lines can't match. The regex is case-sensitive, so `Peak:` matches the `Peak:` line under `True peak:` and not the header itself. The `-inf` alternative is reached when `-?[\d.]+` fails on `-inf`, and it maps to `-Infinity`. The cap then becomes `min(gain, +Infinity)`, which leaves the gain finite, so `toFixed(2)` never sees a non-finite value. A missing reading throws (`:32`).
- **Clamp order.** The ±20 dB clamp runs first, then `min` with `−1 − peak`. `min` can only lower the gain, so the +20 bound always holds. The gain could only go below −20 if the source peaked above +19 dBTP, which is not realistic.
- **Removed behaviour.** The old code put every file through the limiter at 0.89 (about −1.01 dBFS sample peak). For loops and music, the true-peak cap at −1 dBTP gives an equivalent or stronger guard. The other two removed behaviours are also covered. `level=false` is kept. A failed spawn or an overflowing output buffer is now caught by the `run.error` check (`:27`).
- **Narration timing.** Timing still uses `duration(mp3)` of the mastered file. With `latency=true` there is no time offset, which agrees with the measured equal durations (p02 9.84/9.84).
- **Tests.** The reject test swaps `'Water'` for `'Fire!'`, same length, and p01's text contains "Water". It checks the error message with `/does not match/`. The per-block test checks every block's offset and length. The committed-timings test catches stale JSON after a text edit.

## What I did not review

- The WIP reader-engine files in this range (`src/engine/*`, `src/audio/mixer.ts`, `src/ui/*`, `src/content/scenes.ts`, `index.html`, styles, configs). They are outside this scope.
- The binary MP3 outputs. I could not run ffmpeg/ffprobe, so I relied on the stated duration checks and did not measure loudness or true peak myself.
- Whether the installed ffmpeg supports `alimiter`'s `latency` option. I inferred it does, because an unknown option would make `execFileSync` throw.
- MP3 encoder delay and padding at loop seams in the browser. That is older behaviour, not part of the changed lines.
- Items already dispositioned, which I did not re-raise.

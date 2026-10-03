# Review: Water Born reader engine, logic and edge cases

2026-10-03 · range `01af7ac..HEAD` (commit `fd4bb98`): `src/director.ts`, `src/surfaces.ts`, `src/input.ts`, `src/main.ts`, `src/engine/reflection.ts`, `scripts/build-art.ts`, plus the diffs to `src/engine/{book3d,ink,particles,backdrop,stage}.ts`, `src/audio/mixer.ts`, `src/assets.ts`, `src/content/{book,scenes}.ts`, `src/ui/overlays.ts`, `src/styles.css`

## Verdict

The wiring is mostly correct. The leaf/spread/page mapping (`surfaces.ts`, `pageAt`/`spreadOf`), the turn token, the gate state machine, `timeOf`/`spokenChars` and the view-offset projection for overlays and raycasts all check out. One real state-machine defect needs fixing. `Director.speak` does not check again after its first `await`, and when it bails out it leaves the reading in `'intro'` mode. Turning narration off, or turning the page, in that window can leave the narrator talking with voice off (or reading the previous page), and can freeze the page with no words and taps ignored. The other findings are minor.

## Findings

### Major

**1. `speak()` can start stale or unwanted narration, and its bail-out path leaves the page stuck in `'intro'`.** `src/director.ts:347-361`, together with `:326`, `:180-183` and `:422`.

- **Cause A (audio plays when it shouldn't).** `speak` awaits `narrationTiming()` (`:350`) and then calls `playNarration()` without checking `r === this.reading && this.voice` again. Two things can happen during that fetch, and both call `mixer.stopNarration()` before the new `playNarration` captures its `voiceRequest`, so the mixer's supersede guard (`mixer.ts:173-176`) never fires:
  - `setVoice(false)` (`:419-422`) runs. The clip still starts. Then `:353` sees `!this.voice` and returns without stopping it, so the narrator reads the whole page with voice toggled off and the music ducked.
  - A page turn runs `leavePage` (`:253-258`). The old page's clip starts after the turn and keeps playing over the next page's push-in. If the turn landed on the title or credits spread, it plays to the end.
- **Cause B (page freezes).** On the first `speak` from `readPage` (`:326`), `r.mode` is still `'intro'`. Only the success path (`mode = 'voice'`) and the `catch` (`mode = 'timed'`) change it. The early `return` at `:353` changes nothing. `setVoice(false)` does not touch the mode either, because it only converts `'voice'` (`:422`). So turning the voice off (or off and on again) while the first clip is loading leaves the page in `'intro'` for good:
  - `update` never advances `clock` (`:205-210`).
  - `isDone` stays false (`:379`), so no auto-turn and no turn hint.
  - Every right-page tap is swallowed by the `'intro'` branch (`:180-183`). The words never ink in, and only a swipe, the arrow keys or the HUD can leave the page.
- **Fix (two lines, no new machinery):**
  - Right after the timing await, add `if (r !== this.reading || !this.voice) return;`.
  - On the bail-out path, fall back the same way the `catch` does: `if (r === this.reading && r.mode === 'intro') r.mode = 'timed';`. Putting this in `finally` covers both returns.

### Minor

**2. A revisited page shows its full text during the turn, then blanks and re-inks when it settles.** `src/director.ts:253` and `:317`. `leavePage` sets the page you leave to `total + INK_TAIL`. When you come back to it (every backward turn, and forward turns onto pages already read), that fully inked face is visible for the whole turn. Then `readPage` sets it to `0` (`:317`) and the text disappears in one frame before inking in again. On a first visit the incoming page is blank (no entry in `revealed`), so revisits behave differently from first visits. Two possible fixes, depending on intent (see Q1):
- Zero the destination page in `turnStarted` (`const i = pageAt(to); if (i !== undefined) this.p.surfaces.setReveal(i, 0);`), so revisits turn in blank like first visits.
- Leave already-read pages inked.

**3. A slow drag released after a pause can commit as a "flick".** `src/input.ts:37` and `:57`. `velocity` only updates on `pointermove`. If the finger moves fast, stops (no move events while still), then lifts at about 15% of a turn, release still uses the last fast segment, so `-velocity * dir > FLICK` commits a turn the user abandoned. Fix: in `release`, treat velocity as 0 when `e.timeStamp - press.lastT` exceeds about 80–100 ms.

**4. The music fade-out timer leaves a track playing silently after two quick scene changes (A → B → C within 4 s).** `src/audio/mixer.ts:128` (existing code, not changed in this range, but the file is in scope). The guard `if (this.currentMusic !== id || …) return;` skips pausing A whenever the music has moved past B. B's own timer only pauses B, so A's `<audio>` keeps decoding at gain 0. Quick arrow-key or HUD jumps across three music scenes trigger it. It is inaudible and only wastes resources. Fix: capture `const oldId = this.currentMusic` and skip only when `this.currentMusic === oldId`, meaning the old track has become current again.

**5. Two places define the page character index, and one of them is unused.** `src/engine/pages.ts:313-324` and `:354` against `src/content/book.ts:164-171`. `layoutTextPage` recomputes `blockStarts` and `total` with the same join-by-one-space rule and returns them in `TextLayout`. Nothing reads either field: grep finds no use of `.blockStarts` or `layout.total` in `src/` or `tests/`. The director uses `book.ts`'s `blockStarts(page)`. If the two copies ever drift, the ink reveal and narration and cue indices fall out of step without any test failing. Fix: call `blockStarts(page)` from `book.ts` inside `layoutTextPage` and drop the two unused fields. Removing them affects no type narrowing, because they are plain data fields with no consumers.

## Open questions

- **Q1.** `src/director.ts:317`: should a page the reader has already read ink in again on every visit (as now), or stay fully inked? This decides which fix applies to finding 2.
- **Q2.** `src/director.ts:166-172` and `src/input.ts:67-71`: `next()`/`prev()` and drags still turn pages while paused. The new page then sits frozen with the HUD showing "paused" until a tap. The plan only says "Pause stops both" auto-turns, so is manual turning while paused intended?
- **Q3.** `scripts/build-art.ts:35-38`: a file named `pNN-wide.jpg` (no slug) matches the page regex, not the wide one, and becomes `pNN.webp`, or throws a clash error if the page file also exists. Is the naming convention always `pNN-<slug>-wide`?

## What I did not review

- Visual correctness of CSS, shaders (`ink.ts` GLSL, particles fragment), tone mapping and bloom values; screenshots already cover these.
- `src/engine/pages.ts` layout and painting, `cinema.ts` and `ticker.ts`, beyond what the director depends on. Back-to-back push-ins whose `Cinema.play` calls overlap during very fast HUD jumps looked marginal (about 1.6 s against 1.65 s) and were not pursued.
- The geometry in `reflection.ts`, beyond basic sanity.
- The ffmpeg filter strings in `build-art.ts`; I did not run them.
- The audio pipeline (closed earlier) and the binary art.
- This was a static review: I ran nothing in a browser.

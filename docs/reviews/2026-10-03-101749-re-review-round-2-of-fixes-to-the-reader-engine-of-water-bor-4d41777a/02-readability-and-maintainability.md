# Readability and maintainability re-review (round 2): Water Born engine fixes

2026-10-03 · range `9961b09..3bf79d1` (one commit, 17 files) · lens: readability and maintainability

## Verdict

The round-1 maintainability fixes landed cleanly. Moving `gate`/`skipPushIn` into `Reading` takes two pieces of Director-level state off the class, `TITLE_SPREAD`/`nearestPage` replace magic `1`s, `blockStarts` is now the only home for character indices, and `timeOf` has a home and a test. I found three minor leftovers: a doc comment orphaned by the `timeOf` move, a texture-disposal site in `Cinema.play` that the new end-of-play disposal made redundant, and one hand-rolled canvas the `canvas()` consolidation missed. I also traced a narration race that belongs to the logic lens and noted it below without a severity.

## Findings

### Minor

**1. `timeOf` was inserted between `spokenChars` and its doc comment**
- Location: `src/content/narration-timing.ts:9-21`
- Issue: Line 9 still reads `/** How many characters of a block have been spoken by time `t` (seconds into the clip). */`, but it now sits directly above `timeOf`'s own JSDoc (lines 10-13). `spokenChars` (line 21) has no doc at all, so hovers and readers attach the wrong description or none. The project rules (AGENTS.md § Working in the code) call a stale comment "worse than none".
- Fix: Move line 9 to sit directly above `export function spokenChars` at line 21.

**2. Two disposal sites for the push-in texture; the first is now redundant**
- Location: `src/engine/cinema.ts:28` and `src/engine/cinema.ts:46-48`
- Issue: `play()` now disposes `tex` and nulls `material.map` after its fade-out (46-48). Every `play()` reaches that point, because there are no early returns and the tweens always resolve. So the leading `this.mesh.material.map?.dispose()` at line 28 can only see a non-null map if two plays overlap. In that case it would free a texture another `play()` is still displaying, and that play disposes it again at its own end. The one-texture, one-owner rule is now split across two lines with different assumptions.
- Fix: Delete line 28. It has no type-narrowing role, and each `play()` already frees its own texture.

**3. The `canvas()` consolidation missed `book3d.ts`**
- Location: `src/engine/book3d.ts:65-69` (vs. `src/engine/pages.ts:28-35`)
- Issue: The commit exported `canvas()` from `pages.ts` and moved `backdrop.ts` and `reflection.ts` onto it. `edgeTexture()` in `book3d.ts` still hand-rolls `document.createElement('canvas')` plus `getContext('2d')!`, which is the same duplication, and it skips the helper's null-context throw. Grep shows that call and the helper are the only `createElement('canvas')` sites left in `src/`.
- Fix: Use `const [c, ctx] = canvas(8, 64);` from `./pages.ts` (pages.ts does not import book3d, so there is no cycle). Optional: a more specific name than the generic `canvas` would help now that the helper is used outside the page painter.

## Note outside this lens (route to logic-and-edge-cases; not chased further)

`src/director.ts:350-363` with `setVoice` at `:418-427`: say narration is on and `speak` from `readPage` is awaiting the narration MP3 load in `mixer.playNarration`, with `r.mode === 'intro'`. If the reader toggles voice off and back on during that window:
1. Turning it off bumps `voiceRequest` and leaves the mode at `intro`.
2. Turning it on skips `speak`, because the mode is not `'timed'`.
3. When the load resolves, `playNarration` returns `undefined` (superseded).
4. `finally` sets the mode to `'timed'`.

The page then reads silently at reading pace while the HUD shows voice on, until the next page or another toggle. The window is only the load time of an un-prefetched clip. Possible fix: in `finally`, if `this.voice` is still true and the page is current, call `speak` again. Or let `setVoice(true)` also start narration when the mode is `'intro'` and nothing is pending. I give no severity because it is outside this lens.

## Open questions

- `src/engine/pages.ts:28`: is `pages.ts` the intended long-term home for a general canvas helper now that `backdrop.ts` and `reflection.ts` import from it? If more engine modules adopt it, a neutral home (or a clearer name) would keep "page painter" and "canvas utility" separate. I don't recommend acting on this now.

## What I did not review

I reviewed only the diff `9961b09..3bf79d1` plus the code it touches (the director, mixer, cinema, input, surfaces, overlays, pages and book3d windowing/dispose), through the readability and maintainability lens. I did not re-review logic, performance, error handling or tests beyond what the lens needed, and I did not run the verify command, the build or a browser. I relied on the stated green verify and headless walkthrough. I did not read `styles.css` beyond the diff hunk, nor `scripts/` other than the `build-art.ts` hunk. Dispositioned items (narration `pageText` duplicate, `director.ts` size, `boot()` catch, `import.meta.env` testability, phone-landscape text, non-cancellable tweens) were deliberately not re-raised.

# Test review: Water Born reader engine (01af7ac..HEAD)

2026-10-03 · testing lens · `tests/scenes.test.ts` diff, plus the code it should cover: `src/director.ts`, `src/surfaces.ts`, `src/input.ts`, `src/main.ts`, `src/assets.ts`, `src/audio/mixer.ts`, `scripts/build-art.ts`, and the engine diffs for `ink`, `book3d`, `particles` and `overlays`.

## Verdict

The new tests are sound, deterministic and non-tautological. They pin the data contracts the director relies on: block offsets, cue phrases, the card, count and fire anchors, and narration-timing lengths. The gap is the logic around that data. The director's state machine and its one pure helper, `timeOf`, have no tests. Every pure helper in `director.ts` and `surfaces.ts` is also unreachable from Node, because their import chain loads `assets.ts`, which reads `import.meta.env` at the top of the module. Reading the untested state machine turned up one real bug. It belongs to the logic scope and is reported once below. None of this blocks shipping; the fixes are small.

## Findings

### Minor

**1. Toggling voice off while a page's first narration is loading leaves the page stuck and the narrator speaking**
`src/director.ts:347-353` and `src/director.ts:420-423`. Root cause is in the logic-and-edge-cases scope; recorded here because the state machine has no test that would catch it.

How it happens:
- `readPage` calls `speak(r, 0)` while `r.mode` is still `'intro'`, then waits on `narrationTiming()`.
- During that wait, `setVoice(false)` runs. It only switches to timed mode when `r.mode === 'voice'` (line 422). The mode is `'intro'`, so it stays `'intro'`.
- `speak` resumes and calls `playNarration`, which starts the audio. Then it hits `!this.voice` and returns at line 353 without stopping the audio and without changing the mode.

What the user sees:
- The narrator plays with voice turned off.
- The page stays in `'intro'`, so `update()` never moves the clock and no words ink in.
- Every tap, on either page, goes down the skip-push-in branch at line 180 before any side check. Only a drag, the keys or the HUD can leave the page.

The window is the one timing fetch per page, so it is unlikely but reachable on a slow first load.

**Fix:** in `speak`, check `r !== this.reading || !this.voice` again after the timing `await` and before `playNarration`. When `r` is still the current page, set `r.mode = 'timed'` on that early return. A related drift to look at in the same place: `setVoice(true)` (line 423) leaves the mode `'timed'` while `speak` loads, so line 207 keeps moving the clock and can open a count gate while narration is about to start from an earlier offset.

**2. `timeOf` is untested and lives where tests can't import it**
`src/director.ts:563`. This pure function maps a character index to a time in the narration clip. Its only job is resuming narration after each p13 count gate, which is the riskiest timing path on that page. Its edge cases (an index on a block separator, clamping to `at.length - 1`, an empty `at` falling back to 0, which would restart the clip from the beginning) are exactly what unit tests catch. `director.ts` can't be imported in Node because of the `assets.ts` chain.

**Fix:** move `timeOf` next to its counterpart `spokenChars` in `src/content/narration-timing.ts` (`spokenChars` is at line 10). Both read `NarrationTiming`, so it gets one home. Then add a small case to `tests/narration.test.ts`: a gated word's index maps to its first character's start time, and a separator index clamps into the right block.

**3. The sound-file test misses the director's and boot's hard-coded effect ids**
`tests/scenes.test.ts:27-37`. The test builds its id list from scenes only (ambience, `enter` and cue sounds). The engine also plays `card-flip`, `count-chime` and `steam-hiss` (`src/director.ts:499,507,513,521,528`) and preloads `page-turn` and `book-open` (`src/main.ts:54`). Typecheck proves those ids exist in `SFX`, but nothing proves their mastered `.mp3` files exist. A missing file would only produce a `console.warn` in `playSfx`. All five are present today (I checked `public/audio/sfx/`).

**Fix:** loop over `Object.keys(SFX)` and `Object.keys(MUSIC)` and assert each mastered file exists. That is simpler than the scene walk, covers every caller, and removes the near-tautological `Object.keys(MUSIC).length > 0` check. All 25 SFX files exist, so it would pass now.

**4. The anchor tests choose pages by scene name, but the director chooses by `scene.interaction`**
`tests/scenes.test.ts:8,39-56` compared with `src/director.ts:497-532`. The tests read `sceneText('team-intro' | 'vine-leap' | 'last-fire')`. The director anchors `CARDS_PHRASE`, `COUNT_WORDS` and `FIRES_OUT_PHRASE` on whichever page's scene has `interaction: 'cards' | 'count' | 'fires'`. If an interaction moves to another scene, the tests still pass, `text.indexOf` returns -1, and the mark fires at once, so the gate opens at clock 0. It is consistent today (`src/content/scenes.ts`).

**Fix:** have the helper pick the page by `SCENES[p.scene]!.interaction === kind`, and assert exactly one page carries each interaction.

### Info

- **Node can't import `surfaces.ts` or `director.ts`.** `src/assets.ts:3` and `src/audio/mixer.ts:4` read `import.meta.env.BASE_URL` at the top of the module, which is undefined under `node --test`. So `pageAt`, `spreadOf` and `sceneForSpread` can't be tested where they live. I traced the leaf mapping by hand and it is consistent:
  - `leafCount = PAPER_LEAVES + 1 = 20`.
  - Leaf 19's front is text index 17 and its back is the credits.
  - `pageAt(20)` is undefined, and the replay button appears at `leafCount`.

  The headless screenshots didn't include the last spread or the credits. A test here isn't proportionate unless the mapping changes. Moving `spreadOf` and `pageAt` into `content/book.ts` would make it possible later.
- **The director state machine (gates, `isDone`, auto-turn, voice toggling) has no unit tests.** That is reasonable here: testing it in Node would take heavy mocks of the stage, book, mixer and DOM, which over-mocks and couples tests to internals. The headless render check is the right main check. Finding 1 shows the cost: the voice-toggle transitions aren't exercised by either.
- **The `scripts/build-art.ts` filename mapping (`jobFor`) is untested.** A wrong mapping only loses a picture to its placeholder, and the manifest makes that visible, so no test is proposed. Note that `HEROES` (`build-art.ts:12`) repeats the names in `TEAM` (`src/content/scenes.ts`). That is a DRY observation outside this lens.

## Open questions

- After the reader taps "complete reveal" in narrated mode (`src/director.ts`, `completeReveal` sets `revealAll`), should the p13 count gates still pause the narrator? The code pauses them. `docs/plan.md` says "the narrator carries on" without saying whether gates still apply.

## What I did not review

- Shaders, materials and rendering correctness in `ink`, `particles`, `book3d`, `stage`, `backdrop`, `cinema` and `reflection`, beyond their testable surface. These are visual and are covered by the render checks.
- `src/styles.css`, `index.html` and the HUD and overlay DOM behaviour.
- The audio pipeline scripts, which were closed earlier.
- Binary art.

I didn't run the suite or the build. I relied on the stated green `npm run verify`. Lenses outside testing (security, performance, readability) were out of scope, apart from the one logic bug, which is routed above.

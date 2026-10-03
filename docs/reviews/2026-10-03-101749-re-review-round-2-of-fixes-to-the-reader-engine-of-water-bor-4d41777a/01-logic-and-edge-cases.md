# Re-review (round 2): engine round-1 fixes, logic and edge cases

2026-10-03 · range `9961b09..3bf79d1` (one commit, 17 files), logic and edge-case lens

## Verdict

The round-1 fixes are correct, and I found no new crash, stall, double narration, unresolvable gate or shared-texture disposal bug.

- **Narration race:** `speak()` now re-checks after each await, and the `finally` falls back to `'timed'`. Together with the mixer's `voiceRequest` supersession, this closes the permanent `'intro'` stall and the stale-clip start.
- **Ambience:** the delete-then-guarded-stop in `setAmbience` is sound, because `buffer` is assigned right before `start()` in the same synchronous block.
- **Music:** the `currentMusic !== oldId` pause guard is correct for A→B→C, A→B→A and A→B→A→B.
- **Refactors and caches:** the move of `gate`/`skipPushIn` into `Reading`, `nearestPage`/`TITLE_SPREAD`, the `blockStarts` single home, `timeOf`, the leather/grain caches and `localToWorld` all keep the old behaviour.

Three minor items remain. The main one: the `'intro'` loading state still holds the page blank, and swallows taps, until an in-flight load finishes. Narration toggles made during that window also don't fully take effect.

## Findings

### Minor

**1. `setVoice` ignores a reading that is in `'intro'` while the narration loads**

- **Location:** `src/director.ts:417-427`, with `src/director.ts:346-364` and `src/director.ts:179-183`
- **Issue:** `readPage` leaves `r.mode === 'intro'` through the whole first `speak()` (timing fetch plus mp3 load). `setVoice` only acts on `'voice'` and `'timed'`, which causes two leftover symptoms:
  - **Voice turned off during a slow load.** `stopNarration()` bumps `voiceRequest`, but `speak()` is still awaiting `narrationTiming()` or `load()`. The page stays blank in `'intro'` until that request settles. Meanwhile every tap is swallowed as `r.skipPushIn = true` (line 180), including a left-page tap meant to go back. The round-1 fix makes this recover eventually; before, it stalled forever. But the switch the reader just used has no visible effect until the download finishes. `prefetchNarration` only warms the next page, so a HUD `goToPage` jump on a slow connection exposes this.
  - **Off then on during `playNarration`'s load.** The off bumps `voiceRequest`; the on does nothing because the mode is `'intro'`. `playNarration` then resolves `undefined`, and `finally` sets `'timed'`. The page reads silently while the HUD shows narration on. The next page narrates again, so this recovers.
- **Evidence:** at line 424 the `else if` requires `r.mode === 'timed'`. Line 420's off branch only rewrites `'voice'`. At line 361 the `finally` is the only exit from `'intro'`.
- **Fix:** let the reading record that the push-in is over (for example a `pushedIn` flag, or keep `skipPushIn` set after `pushIn` returns). Then have `setVoice(false)` move such an `'intro'` reading straight to `'timed'`, and `setVoice(true)` leave an in-flight `speak` alone or restart it.
- **Fix criteria:** real-defect pass (slow network, Pages host); culprit-evidence pass; root-cause needs judgment, because it needs a state that separates "push-in" from "loading"; proportionate, but low cost.

**2. Orphaned JSDoc in `narration-timing.ts`**

- **Location:** `src/content/narration-timing.ts:9`, with `:21`
- **Issue:** the diff inserted `timeOf` between `spokenChars`'s doc comment and `spokenChars`. Line 9's comment ("How many characters of a block have been spoken by time `t`") now sits directly above `timeOf`'s own JSDoc, and `spokenChars` at line 21 has no doc. Editors attach the last block to `timeOf`, so line 9 floats. This belongs to the readability lane, and I note it because the diff introduced it.
- **Fix:** move line 9 to sit directly above `export function spokenChars` (line 21).

**3. The turn hint now snaps to a static ring while fading out**

- **Location:** `src/styles.css:146-148`, with `src/director.ts:559`
- **Issue:** the `ping` animation is now declared only on `.turn-hint.on`. When `.on` is removed, the animation is cancelled at once. `transform` and `box-shadow` jump back to the base style (scale 1, 0.7-alpha ring) for the 0.5 s opacity fade. Before this change the fade carried the expanding ping. Placement also stops during the fade (line 559 checks `this.hint.on`). The camera drift is small, so that part is negligible. This is a minor visual regression caused by the "animated only while shown" change.
- **Fix:** keep `animation` on `.turn-hint` and add `animation-play-state: paused` to the base rule with `running` on `.on`. Or accept the pop.

### Info

**4. Cinema texture disposal is correct when two push-ins overlap**

- **Location:** `src/engine/cinema.ts:46-48`
- **Note:** if a second `play()` started during the first one's 0.8 s fade-out, `play()`'s opening `map?.dispose()` would free the first texture early. The first `play` would then dispose it again, which is harmless. Its `map === tex` guard keeps it from nulling the newer map. In practice a turn plus `wait(1.1)` keeps the two from overlapping. The shared endpaper (`surfaces.ts:82-85`) and cover materials sit on rigid leaf 0 and the back board. `refreshWindow` keeps rigid leaves (`book3d.ts:290`), so `dispose()` never reaches them. No action needed.

## Open questions

- Is it intended that `'intro'` also covers the narration load, so taps (including a left-page "back" tap) are ignored and the page stays blank until the clip loads? See `src/director.ts:64` (the comment now says so) and `:179-183`. If yes, finding 1 narrows to the voice-toggle symptoms. If no, the reader needs a separate loading state.

## What I did not review

- I read only the `9961b09..3bf79d1` range and the code it depends on (`director.ts`, `mixer.ts`, `surfaces.ts`, `book3d.ts`, `cinema.ts`, `overlays.ts`, `input.ts`, `narration-timing.ts`, `book.ts` `blockStarts`).
- I did not run tests, the build or the browser. I relied on the stated green verify and walkthrough.
- I did not check the visual equivalence of the cached picture grain against the old per-call grain. Multiply-compositing a pre-drawn layer differs slightly where specks overlap; that is a visual question, not a logic one.
- Out of lane and not chased: accessibility, performance measurements and pre-existing behaviour not touched by the diff. One example is the `resuming` flag being cleared by a superseded `speak()` while a newer one is still loading after a rapid voice off→on; that was there before this diff.
- The dispositioned items listed in the scope were not re-raised.

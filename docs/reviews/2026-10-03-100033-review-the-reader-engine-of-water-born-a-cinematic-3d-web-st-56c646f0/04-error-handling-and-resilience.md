# Error handling and resilience review: Water Born reader engine

2026-10-03 · range `01af7ac..HEAD` (commit fd4bb98) · lens: error handling and resilience (correctness)

## Verdict

Most of the error handling is sound. The art manifest, image loads, SFX loads, music `play()`, the narration-to-reading-pace fallback, and the mixer's `voiceRequest` supersede counter all fail into a working state. Missing art does fall back to placeholders. I found two defects that can leave the reader stuck:

1. `Mixer.setAmbience` calls `stop()` on a loop that never started. That throws, and the throw escapes through `Book.turnTo`, so the turn is aborted.
2. `Director.speak` has no staleness check between its two awaits. A narration can start after the voice was turned off or the page was turned, and the page can stay in `'intro'` with every tap ignored.

I also found one minor leak: a music element can keep looping silently.

## Findings

### Major

**1. An ambience loop removed before its buffer loads throws, and the throw aborts the page turn**
- **Location:** `src/audio/mixer.ts:94-95` (with `src/engine/book3d.ts:165` and `src/director.ts:232`)
- **Issue:** `setAmbience` creates the `AudioBufferSourceNode` straight away, but only calls `src.start()` after `load()` resolves (around lines 107-112). If the scene changes before that, the removal loop runs `loop.src.stop(now + 3)` on a source that was never started. The Web Audio spec and MDN both say this throws `InvalidStateError` ("cannot call stop without calling start first" in Chromium). The `this.loops.delete(id)` call on the next line is then skipped.
- **Causal chain:**
  - The call path is `Book.turnTo` → `this.onTurnStart(from, target)` (book3d.ts:165, which runs *before* the leaf targets are set) → `Director.turnStarted` → `setScene` → `mixer.setAmbience` → throw.
  - Keyboard, tap and HUD turns are aborted outright. The book doesn't move, but the director has already bumped `token`, set `spread`/`turning`, cleared the reading and removed the interactions. The page goes dead.
  - On a drag commit, `endDrag` sets `leaf.target` before calling `onTurnStart`, so the leaf does turn. Grade, particles, backdrop, framing and the HUD page label are all skipped.
  - While the load is pending, every retry throws the same way.
  - If the load fails (network drop or decode error), `.catch` only logs and the unstarted entry stays in `loops` for good. Every later turn into a scene without that ambience id then throws.
- **Realistic trigger:** On first visit over GitHub Pages, a reader taps "Start", opens Contents and jumps to a chapter, or taps quickly through the title in self-read mode. Loops are about 320–480 KB (for example, `night-jungle-loop.mp3` is 481 KB), so the load window is easily seconds on mobile.
- **Fix (root cause, 2 lines):** delete the entry first, and only stop a source that was started. In this code `src.buffer` is assigned right before `start()`, so `buffer !== null` means "started":
  ```ts
  this.loops.delete(id);
  if (loop.src.buffer) loop.src.stop(now + 3);
  ```
  The pending `.then` already returns early when `this.loops.get(id)?.src !== src`, so the unstarted node is simply dropped.

**2. `speak()` doesn't re-check state after the timing fetch, so narration can play with the voice off or over the wrong page, and the page can get stuck in `'intro'`**
- **Location:** `src/director.ts:350-353` and `src/director.ts:416-422`
- **Issue:** `playNarration` takes its `voiceRequest` snapshot only when it is called. Any `stopNarration()` that happens during `await narrationTiming(...)` (line 350, an uncached `fetch`) therefore doesn't supersede it. Two paths follow:
  - **Voice toggled off during the first `speak` of a page, while `r.mode === 'intro'`.**
    - `setVoice(false)` (line 422) changes the mode only when it is `'voice'`, so it stays `'intro'`.
    - If the toggle lands during the timing fetch, `playNarration` then *starts the audio*. Line 353 returns because `!this.voice`, so the narration plays with the voice switched off.
    - If the toggle lands during the buffer load, `playNarration` returns `undefined` instead.
    - In both cases `r.mode` stays `'intro'` for good. `isDone` is never true, the clock never advances and no ink shows. `tap()` (line 180) takes the `'intro'` branch and returns, so taps on either page do nothing. Turning the voice back on does nothing either (it only acts on `'timed'`). The reader is stuck until they drag, use the keyboard or use the HUD. That contradicts the plan's "so reading never stalls".
  - **Page turned by key, drag or HUD during the timing fetch.**
    - `leavePage` → `stopNarration` runs before `playNarration` has been called, so the old page's narration still starts. Line 353 only returns afterwards.
    - That audio plays over the next page's push-in (about 7 s), or over the title or credits spread, until something else calls `stopNarration`.
- **Fix:**
  1. Bail out before starting audio by adding `if (r !== this.reading || !this.voice) return;` right after line 350.
  2. Release the stuck mode in `setVoice(false)`: `if (r && (r.mode === 'voice' || r.resuming)) r.mode = 'timed';`. `resuming` is false during a push-in, so `'intro'` survives there and `readPage` still picks the mode afterwards.

  Both are one-line changes and need no new state.

### Minor

**3. A music element leaks and keeps looping (muted) when music changes twice within 4 s**
- **Location:** `src/audio/mixer.ts:127-128`
- **Issue:** The deferred pause checks `this.currentMusic !== id || el === this.tracks.get(id)?.el`. The second half is always false, because `id` differs from the old track's id (equal ids return early) and the map holds one element per id. That makes the guard just "has the music changed again?".
- **Causal chain:** For A→B→C inside 4 s (fast flips across p05→p06→p08 go attack→sorrow→hope, or HUD jumps), A's timeout sees `currentMusic === C !== B` and returns. A's `HTMLAudioElement` keeps decoding and looping at gain 0 indefinitely, and `setPaused` doesn't pause it either. Nothing is audible, but it costs CPU, battery and bandwidth on the iPad.
- **Fix:** capture the outgoing id and pause unless it became current again. This also handles A→B→A:
  ```ts
  const oldId = this.currentMusic;
  setTimeout(() => { if (this.currentMusic !== oldId) el.pause(); }, 4000);
  ```

**4. The empty catch on `preload` is dead code**
- **Location:** `src/main.ts:54`
- **Issue:** `Mixer.preload` returns `Promise.allSettled(...)`, which never rejects, so `.catch(() => undefined)` never runs.
- **Fix:** use `void mixer.preload([...]);`.

### Info

- **`void boot()` has no top-level catch** (`src/main.ts:90`). A throw after the WebGL try block would leave the "Filling the river…" loader on screen forever. I traced every awaited path: `loadFonts` catches, `loadManifest` catches, and `artImage` resolves `undefined` on error instead of rejecting. None of them reject today, so no action is needed. Worth remembering if a rejecting await is added to boot.
- **`Book.refreshWindow` has no catch on `Promise.all([...]).then(...)`** (`src/engine/book3d.ts`, refreshWindow). If a surface ever rejected, the sibling material would leak and the leaf would keep the placeholder until it left the window. `Surfaces.make` can't currently reject (its only await is `artImage`), so no change is proposed.

## Open questions

- **Q1. Should turning the voice back on mid-page resume narration when a count gate is open, or when the page is still in `'intro'`?** At `src/director.ts:416-424`, `setVoice(true)` speaks only for `mode === 'timed' && !this.gate`. After a gate resolves in timed mode, `resolveGate` (line ~388) doesn't start narration either, so that page finishes silently at reading pace. That may be intended ("voice applies from the next page"). It is a behaviour choice, not an error-handling defect.

## What I did not review

- Anything outside the error-handling and resilience lens: visual quality, CSS layout, shader correctness, particle and backdrop maths, and performance beyond the leak above.
- Engine files the range didn't change (`src/engine/pages.ts`, most of `particles.ts` and `stage.ts`). I only read them where a call path needed it.
- The audio pipeline scripts (closed earlier, per the brief) and the binary art.
- I ran nothing. The `stop()`-before-`start()` throw comes from the Web Audio spec and MDN; I didn't reproduce it in a browser. Both major findings need a fetch window, which is easier to hit on a throttled network than on localhost.

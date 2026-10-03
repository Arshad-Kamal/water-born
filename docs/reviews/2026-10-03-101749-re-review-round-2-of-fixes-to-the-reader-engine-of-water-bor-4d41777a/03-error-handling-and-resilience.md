# Error-handling and resilience re-review (round 2): Water Born engine fixes

2026-10-03 · range `9961b09..3bf79d1` (one commit, 17 files) · lens: error handling and resilience, correctness

## Verdict

The two round-1 majors are fixed correctly. In `speak()`, toggling narration off or turning the page during the timing load or the audio load no longer leaves the page stuck in `'intro'`, and no stale clip starts. The `finally` fallback fires only for the one `speak` that can run in `'intro'` (the one from `readPage`). In `setAmbience`, the entry is removed before anything that can throw, and `stop()` runs only on a source that was started. Disposal is correct: the endpaper material and cover texture are never passed to `dispose()` (leaf 0 is rigid and never unloads), and the cinema texture is freed after each push-in. I found no stall, double narration or gate that never resolves. Two minor timing defects remain, each needing a quick user action inside a short window.

## Findings

### Minor

**1. Turning narration off then on during the clip load drops the "on" for that page**
- **Location:** `src/director.ts:353` (`startedAt === undefined` return), the `finally` fallback at about `:360-362`, and `src/director.ts:424` (`setVoice` on-branch)
- **Issue:** Voice is on and a page has just started, so `speak(r, 0)` is waiting in `playNarration` (mode `'intro'`). If the reader taps narration off and then on before the mp3 decodes:
  1. Off calls `stopNarration()`, which bumps `voiceRequest`.
  2. On does nothing, because `setVoice(true)` only restarts speech when `r.mode === 'timed'`, and the mode is still `'intro'`.
  3. `playNarration` returns `undefined` (superseded), so `speak` returns.
  4. The new `finally` sets mode to `'timed'`.

  The page now reads silently at reading pace while the HUD shows narration on. A third toggle is needed to hear it. Nothing stalls, which is the round-1 fix working; the remaining defect is a lost user intent. The window is narrow, because the next page's narration is usually prefetched, so the off/on taps have to land during a cold load.
- **Fix:** in the `finally` fallback, retry once the page is in timed mode:
  ```ts
  if (r === this.reading && r.mode === 'intro') {
    r.mode = 'timed';
    if (this.voice && !r.gate) void this.speak(r, Math.floor(r.clock));
  }
  ```
  This can't loop. Failures go through `catch`, which sets `'timed'` before `finally` runs, and every further supersession needs another user toggle.

**2. A stale music pause timer can cut a track that is fading out again**
- **Location:** `src/audio/mixer.ts:126-130`
- **Issue:** The guard `if (this.currentMusic !== oldId) old.el.pause()` checks only who is current when the timer fires, not whether this timer is still the latest one for that track. Take A→B at t0, B→A at t1, then A→B at t2, all within 4 s. The timer set at t0 fires at t0+4. The current track is B, so it pauses A, even though A only started fading at t2. With the 0.8 s time constant, A is still at roughly 13–37% volume if t2 is 0.8–1.6 s before that, so it stops abruptly. One way to hit this: title (theme) → first story page → back to title → forward again, inside 4 s. The A→B→C case from round 1 is fixed. This is a smaller, separate gap.
- **Fix:** keep one pending timer per track. Before each new fade, `clearTimeout` the track's earlier timer, and also clear it when the track is restarted. This needs one mutable `pauseTimer?: number` on `Track` (currently `readonly` fields). It is a single field, not a new abstraction.

## Open questions

- `src/director.ts:179-183`: `'intro'` now also covers the narration load after the push-in. During that time every tap, including a left-side "go back" tap, only sets `r.skipPushIn` and is otherwise ignored. Is it intended that taps do nothing while the narrator loads? The updated `Reading.mode` comment suggests yes. If not, `tap` could swallow only during an actual push-in.

## What I did not review

- I reviewed only the error-handling and correctness lens over `9961b09..3bf79d1`.
- I did not run anything: no verify, no build, no browser. Every conclusion above comes from reading the code, so the author's green verify and headless walkthrough are not independently confirmed.
- I did not check visual or perf effects: shared grain on every picture, cards re-laid out only on size change, the hint's position freezing while it fades out.
- I left out issues that existed before this range. For example, when two `speak` calls overlap, the first one's `finally` clears `r.resuming` early. I traced it and it is harmless in the realistic paths.
- One note outside my lane, for readability: in `src/content/narration-timing.ts:9`, the commit placed `timeOf`'s JSDoc under `spokenChars`' JSDoc. The "How many characters…" comment is now orphaned above `timeOf`, and `spokenChars` (`:21`) has no doc. Moving that line down to `spokenChars` fixes it.
- I did not re-raise the dispositioned items listed in the brief.

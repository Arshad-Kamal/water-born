# Performance review: Water Born reader engine (01af7ac..HEAD)

2026-05-08 · range `01af7ac..HEAD`. I read src/director.ts, src/surfaces.ts, src/main.ts, src/input.ts, src/assets.ts, src/audio/mixer.ts, src/engine/{book3d,stage,backdrop,cinema,ink,reflection,ticker,pages}.ts, src/ui/overlays.ts, src/styles.css (cards, count, fires, hint) and scripts/build-art.ts, all through the performance lens.

## Verdict

The engine is healthy for performance. Nothing grows without bound: particles use fixed pools, overlays and punches remove themselves, stale leaf loads are disposed, the texture window keeps GPU memory flat, and the per-frame hot paths (`Director.update`, `followNarration` with its binary search, `setReveal` as a single uniform write) are cheap. The findings are minor, and most of them sit on the two moments a reader notices: the start of a page turn and the per-frame overlay placement. The largest is a deterministic 60k-rect grain pass that runs again for every picture page on every turn.

## Findings

### Minor

**1. Picture pages repaint about 60,000 identical grain rects on every turn**
- Location: `src/engine/pages.ts:376` (`grain(ctx, TEX_W, TEX_H, 7, 0.6)` in `artPage`), called from `src/surfaces.ts:115` (`picture()`). The trigger is `src/engine/book3d.ts:174` / `:207` (`refreshWindow(target)` at turn start).
- Issue: `grain()` (`pages.ts:43`) loops `(1024*1536)/26 ≈ 60,494` times. Each pass builds a new `rgba(...)` string, parses it as `fillStyle` and calls `fillRect`, then 260 curve strokes follow. Seed (7) and strength (0.6) are constant, so the result is the same every time. Each turn brings a new leaf into the window, which builds a fresh picture canvas on the main thread right as the turn animation starts. Going back re-enters the window and repaints again. Boot pays the same cost for p01.
- Fix: cache the grain layer once, the same way `paperCache` already caches parchment: paint it on a transparent 1024×1536 canvas, then in `artPage` use `ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(grainLayer, 0, 0)`. That replaces 60k draw calls with one. The output differs from today's only where translucent specks overlap, which won't be visible.
- Fix criteria: real-defect yes (every turn); culprit cited; root-cause fix (the repeated work is removed, not hidden); net-simple (it reuses the `paperCache` pattern); proportionate. My estimate of tens of milliseconds per turn, more on iPad Safari, comes from reading the code. I didn't measure it.

**2. `pagePoint` / `pageUvPoint` recompute the whole book's world matrices on every call, several times a frame**
- Location: `src/engine/book3d.ts:144` and `:150` (`this.group.updateMatrixWorld()`), called from `src/director.ts:548-558` (`placeOverlays`, which runs every frame from `update` at `:200`).
- Issue: in three 0.186.1, `updateMatrixWorld()` runs `updateMatrix()` on every descendant, and that call always sets `matrixWorldNeedsUpdate = true` (`node_modules/three/src/core/Object3D.js:1144-1198`). So every call composes and multiplies matrices for the group, 20 skinned leaves and their 20×29 = 580 bones, plus the back board: about 600 objects. `placeOverlays` makes 1 such call per frame on every page for the hint, 4 on p09 (cards plus hint), 2 on p13 and 5 on p16 (four fires plus hint). The renderer already does this traversal once per frame. The overlays only need the group's own matrix.
- Fix: in both helpers, replace `updateMatrixWorld()` + `applyMatrix4(this.group.matrixWorld)` with `this.group.localToWorld(out.set(...))`. Three already uses this helper, and it calls `updateWorldMatrix(true, false)`, which updates the parents and the group but none of the children. The diff gets smaller.
- Fix criteria: real per-frame cost, but small in absolute terms (my estimate is fractions of a millisecond); a one-line root-cause fix that reuses three's own API; durable.

**3. The endpaper (and leather) canvases are painted twice at boot**
- Location: `src/main.ts:60` (`surfaces.endpaperMaterial()` for the back board) and `src/surfaces.ts:102` → `:79` (leaf 0's back face calls `endpaperMaterial()` again). Leather: `src/surfaces.ts:73` and `src/engine/pages.ts:501`.
- Issue: each `endpaperMaterial()` call paints a new 1024×1536 canvas, including the 60k-rect `grain` at `pages.ts:476`, and uploads its own mipmapped texture (about 8 MB on the GPU). Both materials live for the whole session because leaf 0 is rigid and never leaves the window. `leather()` (9,000 arcs) is also painted twice, once for the cover board and once inside `cover()`.
- Fix: memoize the endpaper promise the way `coverTexture()` memoizes `coverMap`, and drop `owned` from it since it is shared and never disposed, like the cover. Optionally cache `leather()` the way `paper()` is cached.
- Fix criteria: real one-time boot cost plus about 8 MB of duplicate GPU memory; the fix reuses an existing pattern in the same file.

**4. Cards rewrite 20 custom properties every frame, forcing card layout, transition retargeting and box-shadow repaints on p09**
- Location: `src/ui/overlays.ts:53-62` (`Cards.place`), called every frame from `src/director.ts:554`. Styles: `src/styles.css:107-108`, `:123`.
- Issue: `--w`, `--x`, `--y` and `--r` are set on 5 cards every frame. `--w` drives `width`/`height`, so it triggers layout. `--x`/`--y` feed a `transform` that has a 0.7 s `transition`, so every change restarts the transition. Lit cards carry a 50px-blur `box-shadow`. When the page is wide enough, `cardW` is clamped at 170 and the values don't change, so the browser skips them. On narrower viewports (iPad and phone landscape) `width / 3.1 < 170`, and the camera's breathing drift changes the values slightly every frame.
- Fix: round `cardW` to whole pixels and return early when it equals the last value. The root `translate` stays per-frame, which is cheap because it is transform-only.
- Fix criteria: affects only p09 on the secondary and tertiary devices; small, local fix.

**5. The turn hint is moved and animated every frame even while hidden**
- Location: `src/director.ts:558` (unconditional `this.hint.place(...)`), `src/ui/overlays.ts:186-189` (sets `left`/`top`), `src/styles.css:146-147` (`animation: ping 1.8s infinite`, with `box-shadow` in the keyframes).
- Issue: for the whole session, the hint's `left`/`top` are written every frame and its `box-shadow` keyframe animation keeps running, even though the hint sits at `opacity: 0` almost all the time. Box-shadow keyframes can't run on the compositor, so this costs main-thread style work every frame.
- Fix: run the animation only on `.turn-hint.on` (move `animation` there, or add `animation-play-state: paused` on the base rule), and place the hint only while it is on, or when it turns on.
- Fix criteria: low cost per frame but paid permanently; a CSS-plus-one-line fix. Proportionality is modest.

**6. The push-in texture stays on the GPU after the shot ends**
- Location: `src/engine/cinema.ts:45`. The texture is created at `:29-33` and only disposed at the start of the next `play`.
- Issue: after the fade-out, the full-frame texture (up to a 1920-wide `-wide` image plus mipmaps, about 11 MB) stays resident until the next push-in, and after the last one it stays for the rest of the session.
- Fix: after `this.mesh.visible = false`, call `this.mesh.material.map?.dispose(); this.mesh.material.map = null;`.
- Fix criteria: real but small; it borders on failing the proportionality test, so this is low priority.

## Open questions

1. Is there a visible hitch at the start of a single page turn on the iPad? `src/engine/book3d.ts:174` and `:207` call `refreshWindow(target)` when a turn starts. For a one-step turn, the leaf this loads (spread+2) isn't needed until the *next* turn, yet its canvas painting (finding 1) and its roughly 3 texture uploads (6 + 6 + 1.5 MB before mipmaps) happen during the current turn's animation. If a hitch shows up, loading at settle for single-step turns would be the targeted fix. Jumps still need the load at start. Without runtime evidence I can't call this a defect.
2. Would `img.decode()` before resolving in `src/assets.ts:28-33` cut main-thread decode time? `artImage` resolves on `onload`. `decoding = 'async'` has no effect on canvas `drawImage`, so the first `drawImage` in `artPage`/`cover`/`blurred` may decode synchronously. Whether Safari reuses an image decoded by `decode()` for canvas draws needs measuring on the target device.
3. Is the session's memory footprint acceptable on the iPad? `src/assets.ts:6` (`images`) and `src/audio/mixer.ts:28` (`buffers`) keep every image and decoded AudioBuffer for the whole session. Both are bounded by the book's size (31 images, 18 narration clips plus SFX and loops), so they don't grow without limit. Decoded narration is Float32 at the context's sample rate, so roughly 10 MB per minute per channel. Has a full read-through been checked on the iPad?

## What I did not review

- Runtime profiling: I measured nothing. Every cost above is estimated from the code.
- Correctness, security and accessibility: outside this lens.
- Binary art (`public/art/*.webp`), as the scope instructed.
- The previously closed audio pipeline (`scripts/gen-audio.ts`, `master-audio.ts`, `narration*.ts`), apart from checking its output format.
- `src/ui/hud.ts`, `particles.ts` beyond the changed shader line and the fixed-pool structure, and `tests/`.
- `scripts/build-art.ts`, beyond confirming it is a one-shot dev script whose sequential ffmpeg calls don't matter for performance.

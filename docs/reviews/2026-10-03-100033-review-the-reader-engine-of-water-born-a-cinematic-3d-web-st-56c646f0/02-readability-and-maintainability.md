# Code review: Water Born reader engine (readability and maintainability)

2025 · `01af7ac..HEAD` (one commit, `fd4bb98`): `src/director.ts`, `src/surfaces.ts`, `src/input.ts`, `src/main.ts`, `src/engine/reflection.ts`, `scripts/build-art.ts`, plus the deltas in `src/engine/{backdrop,book3d,ink,particles,stage}.ts`, `src/audio/mixer.ts`, `src/ui/overlays.ts`, `src/assets.ts`, `src/content/{book,scenes}.ts`, `src/styles.css` and `tests/scenes.test.ts`.

## Verdict

The engine is in good shape. Constants are named, comments explain *why*, `director.ts` is split into clear sections, and the token-based cancellation is applied consistently. The one major issue is the reading state model in `director.ts`. It is spread across `mode`, `resuming`, `narrationOver`, `revealAll` and the Director's own `gate` and `skipPushIn`, and the doc comment on `'intro'` describes it wrongly. That combination hides a reachable stuck-page path. The rest are small one-home and duplication fixes, mostly new second homes this commit created for facts that already lived somewhere else.

## Findings

### Major

**M1. The reading state is implicit, and `'intro'` covers more than its doc says; a page can get stuck.**
- **Location:** `src/director.ts:64`, plus `src/director.ts:326`, `:352` and `:421-422`.
- **Issue:** The doc says `'intro'` means "while a push-in plays". In practice `readPage` leaves `mode = 'intro'` after the push-in, until `speak()` has loaded the timing JSON and the MP3 (`:326`, then `:352` sets `'voice'`). If the reader turns the voice off during that load:
  1. `setVoice(false)` calls `stopNarration()`, which bumps `voiceRequest`. It only downgrades `mode === 'voice'`, so `'intro'` stays (`:421-422`).
  2. `playNarration` resolves `undefined` and `speak` returns early at `:352` without choosing a mode.
  3. `mode` stays `'intro'` permanently. `update()` never advances `clock`, `isDone` stays false, and every tap goes to the `skipPushIn` branch (`tap`, around `:180`). Toggling the voice back on does nothing either, because `setVoice(true)` requires `mode === 'timed'`.
- The page is stuck until the reader uses an arrow key or drags. The window is the first narration load on each page, which can take seconds on an iPad over the network.
- The root cause is maintainability: there are five overlapping flags and no named "loading voice" state, so the supersede path in `speak` was never given a mode.
- **Fix (smallest):** in `speak`, handle the superseded case the way `catch` already does: `if (startedAt === undefined || !this.voice) { if (r === this.reading && !this.voice) r.mode = 'timed'; return; }`. Then correct the `'intro'` doc to say "push-in playing, or first narration still loading; the words wait".

### Minor

**m1. `TextLayout.total` and `TextLayout.blockStarts` are dead output and a second home for the character indexing.**
- **Location:** `src/engine/pages.ts:120-122`, `:313-323`, `:354`, against `src/content/book.ts:161-171`.
- **Issue:** `layoutTextPage` computes and returns `total` and `blockStarts`. Nothing in `src/` or `tests/` reads them (grep shows `.total` and `.blockStarts` only on `Reading` in the director). This commit added `book.ts` `pageText` and `blockStarts` as "the" home for page character indices, and the ink mask's per-character indices must match them exactly.
- **Fix:** drop `total` and `blockStarts` from `TextLayout`. Have `layoutTextPage` take `const starts = blockStarts(page)` and pass `starts[i]` to the block painters instead of re-deriving `index += block.text.length + 1`. That leaves one formula. Since there are no readers, removing the fields type-checks.

**m2. `pageText` now exists twice.**
- **Location:** `scripts/narration.ts:48-50` and `src/content/book.ts:161`.
- **Issue:** Both join a page's blocks with `' '`. The `book.ts` version is new and is documented as the canonical index space.
- **Fix:** in `narration.ts`, `export const pageText = (page?: Page) => page && bookPageText(page);`, or have `gen-audio.ts` import from `book.ts` directly. This is one line and touches no behaviour.

**m3. The hero list and the card asset naming have two homes.**
- **Location:** `scripts/build-art.ts:12` and `:42`, against `src/content/scenes.ts:109` and `src/director.ts:498`.
- **Issue:** `HEROES = ['kyle', …]` restates `TEAM`'s names. The `card-<name>` naming is built separately in `build-art.ts` and `director.ts`. If a hero is renamed or added in `TEAM`, the art build silently skips that card.
- **Fix:** `build-art.ts` can `import { TEAM } from '../src/content/scenes.ts'`, which is safe because `scenes.ts` has only type imports and other scripts already import `src/content`. It would then use `TEAM.map(m => m.name.toLowerCase())`. At `director.ts:498`, compute the name once: `const name = \`card-${m.name.toLowerCase()}\`; return hasArt(name) ? artUrl(name) : undefined;`.

**m4. The spread-to-nearest-page clamp is written twice.**
- **Location:** `src/director.ts:109-112` (`sceneForSpread`) and `src/director.ts:286` (`showBackdrop`).
- **Issue:** One version is `Math.min(Math.max(spread - spreadOf(0), 0), n - 1)`, the other is `pageAt(spread) ?? (spread <= 1 ? 0 : n - 1)`. They express the same mapping in two forms.
- **Fix:** one helper `nearestPage(spread) = pageAt(spread) ?? (spread <= TITLE_SPREAD ? 0 : book.pages.length - 1)`, used by both.

**m5. The title spread is the bare literal `1` in seven places.**
- **Location:** `src/director.ts:145`, `:160`, `:164`, `:247`, `:274`, `:286`, `:436`.
- **Issue:** `surfaces.ts:17` names `FIRST_PAGE_SPREAD = 2`, but the title spread is spelled `1` throughout the director (`turnTo(1, true)` twice, `spread > 1`, `spread <= 1` twice, `settled === 1 && spread === 1`).
- **Fix:** export `TITLE_SPREAD = FIRST_PAGE_SPREAD - 1` from `surfaces.ts`, next to its sibling, and use it in the director.

**m6. The drag amount formula is written twice in two forms.**
- **Location:** `src/input.ts:48` and `:56`.
- **Issue:** `(-dx * press.dir) / press.span` at line 48 and `((x0 - e.clientX) * dir) / span` at line 56 compute the same quantity.
- **Fix:** a local `const turnAmount = (p: Press, x: number) => ((p.x0 - x) * p.dir!) / p.span;` used in both places.

**m7. A new canvas-plus-2D-context helper duplicates an existing one (likely duplication).**
- **Location:** `src/engine/backdrop.ts:8-15` (`canvas2d`) against `src/engine/pages.ts:28-35` (`canvas`). `src/engine/reflection.ts:10-13` also inlines the same steps.
- **Issue:** That makes three hand-rolled copies of "create canvas, size it, get its context".
- **Fix:** export `canvas` from `pages.ts` and reuse it in `backdrop.ts` (setting `imageSmoothingQuality` at the call site) and `reflection.ts`. The saving is small, so this is low priority.

**m8. Per-page state lives on the Director, so `leavePage` resets it by hand.**
- **Location:** `src/director.ts:130-133` and `:250-266`.
- **Issue:** `gate`, `skipPushIn` and `interactions` belong to one page's reading but are Director fields. `leavePage` has to clear each one separately and remove the three interactions one by one (`:261-263`). This is the same scatter behind M1.
- **Fix:** move `gate` and `skipPushIn` onto `Reading`, so `this.reading = undefined` clears them, and remove interactions with `Object.values(this.interactions).forEach((i) => i.remove())`. Do this only alongside M1; on its own it is optional.

### Info

**i1. `director.ts` is the largest file (568 lines).** It holds turning, reading, cues and interactions in one class. The `// ----------` sections are cohesive, and splitting out interactions would add a module for little gain under KISS. No action.

## Open questions

1. `src/engine/book3d.ts:10-11`: `BASE_Z = 0.014` and the new `COVER_DEPTH = 0.014` have the same value. Is `BASE_Z` meant to be derived from the board thickness (for example, the paper resting on the back board)? If so, `BASE_Z = COVER_DEPTH` documents the coupling. If it's a coincidence, a one-line comment on `BASE_Z` would stop the next reader from "fixing" one and not the other.
2. `src/surfaces.ts:1-4`: the header uses 1-based "page k" for leaves and 0-based "page index s-2" for spreads. Both are correct as written. Is the mixed numbering intentional, or should the header use page indices throughout?

## What I did not review

I did not review the parts of `src/engine/pages.ts`, `book3d.ts`, `cinema.ts`, `particles.ts`, `ticker.ts`, `src/ui/hud.ts` and `src/ui/overlays.ts` that this range left unchanged; I read only the bits I needed for cross-reference. I did not review the audio pipeline scripts beyond confirming the `pageText` duplicate (they were closed earlier), the binary `public/art/*.webp`, `index.html`, or `docs/` prose.

I ran nothing (no build, tests or browser). Findings come from reading the code. M1's stuck path is traced by hand through `readPage`, `speak`, `setVoice`, `update` and `tap`, not reproduced. Visual, shader and lighting correctness and the WebGL behaviour are outside this lens.

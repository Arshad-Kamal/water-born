<!-- 2026-10-02 · Plan approved by Arshad in session "Water Born 3D storybook". Living record: update in place. -->
# Water Born: cinematic 3D storybook

Goal: a free-hosted web storybook of James's story "Water Born", read as a 3D book whose scenes spill out of the pages (light, particles, sound, camera). Story words stay verbatim; everything else (art, sound, effects, pacing) is creative liberty.

## Status (overwrite in place, max 6 lines)
- Done: steps 1–5. Mockup v1 approved 2026-10-03. Audio: 18 narration, 25 SFX, 7 music (originals `audio-src/`, mastered `public/audio/`).
- Spike lessons for the engine: body text ~85px+ on a 1536px page texture; less oblique camera than the spike.
- Arshad generating round 3 art (26 images, `asset-prompts.md`), batch A first.
- Step 7 IN PROGRESS (WIP checkpoint, typecheck green, not wired, not reviewed): `src/content/scenes.ts`, `src/engine/*`, `src/audio/mixer.ts`, `src/ui/*`, `src/assets.ts`, `index.html`, `src/styles.css`, `vite.config.ts`. Missing: `src/director.ts`, `src/main.ts`, `scripts/build-art.ts` (+ `public/art/manifest.json`), dev/build npm scripts.
- iPad fps check deferred to the first GitHub Pages deploy (Arshad, 2026-10-02).

## Decisions (Arshad, 2026-10-02)
- Experience: 3D book + atmosphere spilling out + 4 camera push-ins (pages p05, p06, p12, p17).
- Devices: laptop / iPad landscape primary; phone landscape gets a lighter mode.
- Narration: ElevenLabs, ONE voice only (credits are limited; pay-as-you-go). No auditions: pick from free voice-library previews, generate the full narration once. "Read to me" / "I'll read myself" choice on the start screen.
- Art: ChatGPT images from prompts we write. James picked style A, painted storybook (2026-10-02); all prompts run in one ChatGPT chat seeded with `assets-in/style-a-painted.jpg`. Characters: Kyle, Logan, Ruby, Zoro, Flora are all Water tribe kids; looks and powers are our creative call.
- Text: James's spellings stay ("resistence", "All I can see was", "Lucky I had"). Title page: "Story by James".
- Hosting: GitHub Pages, public repo under `Arshad-Kamal`, GitHub Actions deploy, at `arshad-kamal.github.io/<repo>`.
- Music: ElevenLabs Music API (`music_v2_5`), available on Arshad's pay-as-you-go plan.
- Interactions are optional; each auto-resolves after a few seconds so reading never stalls.
- p09 character cards are cropped from the round 2 sheets (no extra prompts); regenerate as dedicated portraits only if they look soft.
- Pages are 2:3 portrait to match ChatGPT's 1024×1536 output (spike used 3:4); push-in scenes also get a 3:2 wide. Raw art lands in gitignored `assets-in/`; optimised WebP gets committed.

## Visual direction (mockup v1)
- Book floats in a world made from the current scene's art, heavily blurred and graded, with firelight/ember or water particles per scene.
- Teal leather boards with gold tooling; parchment pages; left page = full-bleed art, right page = text.
- Type: Fraunces (display: title, running heads, folios), Alegreya (body, ~25px on a 474px page).
- Signature: narration reveals words in wet aqua ink that blurs in, then dries to dark sepia.
- Start screen: closed book hovering over a dark lake with its reflection; "Read to me" (primary) / "I'll read myself".
- HUD: one glass bar: chapter name, 18-segment progress grouped by chapter, narration / pause / contents.

## Architecture
- Vite + TypeScript + Three.js (pages = skinned bending meshes, page content drawn to canvas textures), raw Web Audio. Vanilla Three over React Three Fiber (fewer parts). Howler.js and GSAP dropped (were planned): Web Audio is needed anyway for the underwater low-pass and sample-accurate narration sync; a small tween helper covers animation.
- `src/content/book.ts` is the one home for page text + scene slugs (scene cues get added there). Pagination lives there, not here.
- Audio: `npm run audio:gen -- <narration|sfx|music|all> [id]` writes paid originals once to `audio-src/` (committed, never overwritten); `npm run audio:master` builds `public/audio/` (static gain to LUFS targets: narration -16, SFX -17, loops -26, music -21; plus `narration/<page>.json` per-character timings). Sound list + prompts: `src/content/sound.ts`; narrator tags: `scripts/narration-direction.ts`. The API key never ships to the browser or the repo.
- Music by mood: theme (cover/p01), attack (p02–p05), sorrow (p06–p07), hope (p08–p10), journey (p11–p14), stealth (p15–p16), victory (p17–p18).
- Fallback if the 3D book is not smooth/readable on the target device: CSS 3D page flip with the WebGL atmosphere behind it.

## Scene design (by `scene` slug in book.ts)
| page | scene | art / atmosphere / sound | interaction |
|---|---|---|---|
| p01 | two-tribes | two tribes; calm water shimmer, distant ember glow; title theme | |
| p02 | roof-collapse | roof caving in; Boom/Crsh punch-in type, shake, dust, orange flicker; explosion, crash, rumble | tap sound words to replay |
| p03 | village-fire | Kyle leaps out; embers rise off page, heat haze; fire crackle, water whoosh + hiss | |
| p04 | uppercut | diving uppercut; impact flash; whoosh, hit | |
| p05 | dragons | PUSH-IN; dragon shadow sweeps the book, wing gusts; roar | |
| p06 | lake-dive | PUSH-IN; screen goes underwater: bubbles, caustics, low-pass muffled audio | |
| p07 | amazon-night | night river; fireflies; jungle night ambience | |
| p08 | training | training montage; river ambience | |
| p09 | team-intro | freeze-frame + record scratch (fourth wall) | 5 character cards slide out, tap to flip |
| p10 | dusk-setoff | dusk silhouettes; colour returns, music resumes | |
| p11 | river-swim | swimming; ripples on the book, SPLASH spray hits camera | tap SPLASH |
| p12 | waterfall | PUSH-IN; mist, roar builds | |
| p13 | vine-leap | leap onto vines; whoosh | tap to count One/Two/Three |
| p14 | moonlit-camp | moon rises to its peak, stars; crickets | |
| p15 | sneak-camp | dawn light, birds; stealth music | |
| p16 | last-fire | guard spots them | tap fires to put them out |
| p17 | final-battle | PUSH-IN; water vs fire clash | |
| p18 | peace | sunrise, mist rainbow; finale music | replay |
Plus: cover, title page ("Story by James"), back cover with credits.

## Steps
1. [x] Setup: git, `.gitignore`, `.env`, docs + DOX index, AGENTS.md stack/commands, this plan, `docs/story-original.md`, `src/content/book.ts`, `tests/story-verbatim.test.ts`.
2. [x] Smokes (real-device fps deferred to first deploy): ElevenLabs (subscription/credits, one `with-timestamps` clip on `eleven_v4` with audio tags, one SFX); Three.js page-bend + canvas text prototype checked on the real device.
3. [x] Art round 1: `docs/art-bible.md` (characters, palette) + 3 style-test prompts → James picks → character-sheet prompts.
4. [x] Design-sandbox mockup: start screen + one spread → Arshad approves.
5. [x] Audio: pick voice → narration with timings → SFX → ambience loops → music.
6. [ ] Remaining scene prompts (`docs/asset-prompts.md`); Arshad generates into `assets-in/`.
7. [ ] Reader engine: book, page turn, text reveal, audio, FX system, interactions, push-ins, settings, preload.
8. [ ] Integrate assets (image optimisation script → WebP).
9. [ ] Verify: verbatim test, typecheck, build, render-local screenshots, independent review, real-device test with James.
10. [ ] Deploy: GitHub repo + Actions → Pages.

## Review dispositions
- Audio pipeline review (`docs/reviews/2026-10-03-091138-*`, range 5d2660f..2c72c55). Fixed: alimiter delay/dynamics (loops + music now peak-capped static gain; narration/one-shots keep a `latency=true` limiter), stale comments, ENOENT handling, `%20` paths in logs, weak timing/throws/boundary tests, new test that committed timings match `book.ts`. Rejected: alignment-before-mp3 write order (two local sync writes, no realistic credit risk); duplicated `buildNarrationInput(..., DIRECTION[id] ?? [])` call in two scripts (two call sites, no abstraction yet); `readdirSync` id derivation and the two `loop` narrowings (clear enough); UTF-16 offset assumption (story text is ASCII and `toTiming` rejects any mismatch).

## Risks
- 3D text legibility/perf on iPad/phone (step 2 smoke decides; fallback above).
- ChatGPT character consistency: character sheets first, one ChatGPT conversation, re-upload sheet with each scene prompt.
- Spectacle burying the story: effects never cover text and calm down while text reveals.

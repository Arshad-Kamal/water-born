<!-- 2026-10-02 · Plan approved by Arshad in session "Water Born 3D storybook". Living record: update in place. -->
# Water Born: cinematic 3D storybook

Goal: a free-hosted web storybook of James's story "Water Born", read as a 3D book whose scenes spill out of the pages (light, particles, sound, camera). Story words stay verbatim; everything else (art, sound, effects, pacing) is creative liberty.

## Status (overwrite in place, max 6 lines)
- Done: step 1; step 2 audio smoke (pass) and book mechanics smoke (`spikes/book-proto`, gitignored: skinned page curl, canvas text + shader ink reveal, bloom, embers, Web Audio sync all work in headless Chromium).
- Open from step 2: real-device fps on the reading device; spike lessons: body text needs ~85px+ on a 1536px page and a less oblique camera.
- Step 3: James chose style A (painted); style lock in `art-bible.md`. Round 2 prompts (5 kids, fire soldier, dragon) ready in `asset-prompts.md`. Waiting on Arshad: 7 sheets in `assets-in/` + James's OK on each.
- iPad fps check deferred to the first GitHub Pages deploy (Arshad, 2026-10-02). Spike preview server stopped.

## Decisions (Arshad, 2026-10-02)
- Experience: 3D book + atmosphere spilling out + 4 camera push-ins (pages p05, p06, p12, p17).
- Devices: laptop / iPad landscape primary; phone landscape gets a lighter mode.
- Narration: ElevenLabs, ONE voice only (credits are limited; pay-as-you-go). No auditions: pick from free voice-library previews, generate the full narration once. "Read to me" / "I'll read myself" choice on the start screen.
- Art: ChatGPT images from prompts we write. James picked style A, painted storybook (2026-10-02); all prompts run in one ChatGPT chat seeded with `assets-in/style-a-painted.jpg`. Characters: Kyle, Logan, Ruby, Zoro, Flora are all Water tribe kids; looks and powers are our creative call.
- Text: James's spellings stay ("resistence", "All I can see was", "Lucky I had"). Title page: "Story by James".
- Hosting: GitHub Pages, public repo under `Arshad-Kamal`, GitHub Actions deploy, at `arshad-kamal.github.io/<repo>`.
- Music: ElevenLabs Music API (`music_v2_5`), available on Arshad's pay-as-you-go plan.
- Interactions are optional; each auto-resolves after a few seconds so reading never stalls.
- Pages are 2:3 portrait to match ChatGPT's 1024×1536 output (spike used 3:4); push-in scenes also get a 3:2 wide. Raw art lands in gitignored `assets-in/`; optimised WebP gets committed.

## Architecture
- Vite + TypeScript + Three.js (pages = skinned bending meshes, page content drawn to canvas textures), GSAP timelines, Howler.js audio. Vanilla Three over React Three Fiber (fewer parts).
- `src/content/book.ts` is the one home for page text + scene slugs (scene cues get added there). Pagination lives there, not here.
- Audio is generated ahead of time by `scripts/gen-audio.ts` into `public/audio/` (+ narration timing JSON). The API key never ships to the browser or the repo.
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
3. [ ] Art round 1: `docs/art-bible.md` (characters, palette) + 3 style-test prompts → James picks → character-sheet prompts.
4. [ ] Design-sandbox mockup: start screen + one spread → Arshad approves.
5. [ ] Audio: pick voice → narration with timings → SFX → ambience loops → music.
6. [ ] Remaining scene prompts (`docs/asset-prompts.md`); Arshad generates into `assets-in/`.
7. [ ] Reader engine: book, page turn, text reveal, audio, FX system, interactions, push-ins, settings, preload.
8. [ ] Integrate assets (image optimisation script → WebP).
9. [ ] Verify: verbatim test, typecheck, build, render-local screenshots, independent review, real-device test with James.
10. [ ] Deploy: GitHub repo + Actions → Pages.

## Risks
- 3D text legibility/perf on iPad/phone (step 2 smoke decides; fallback above).
- ChatGPT character consistency: character sheets first, one ChatGPT conversation, re-upload sheet with each scene prompt.
- Spectacle burying the story: effects never cover text and calm down while text reveals.

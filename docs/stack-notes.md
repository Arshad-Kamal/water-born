<!-- 2026-10-02 · Verified version facts and gotchas, from docs fetched and checks run in session "Water Born 3D storybook". Re-verify on version bumps. -->
# Stack notes

## Toolchain (verified 2026-10-02)
- Node v24.18.0 runs `.ts` tests directly (`node --test "tests/**/*.test.ts"`, built-in type stripping). Imports of `.ts` files need the explicit extension + `allowImportingTsExtensions` in tsconfig; `erasableSyntaxOnly` keeps code strippable (no `enum`, no parameter properties).
- TypeScript 7.0.2 (`tsc --noEmit`), `@types/node@24`. npm latest at setup: three 0.186.1, vite 8.3.2 (not yet installed).

## ElevenLabs API (docs read 2026-10-02, elevenlabs.io/docs)
- Auth header `xi-api-key`; key lives only in `.env` as `ELEVENLABS_API_KEY`.
- TTS models: `eleven_v4` (flagship, 10,000 char limit, audio tags), `eleven_v3` (5,000), `eleven_multilingual_v2` (10,000). Unverified: whether `eleven_v4` works on the plain TTS `with-timestamps` endpoint (docs say v4 is "available via the Text to Dialogue API"; quickstart uses it with `text_to_speech.convert`). Smoke in step 2.
- `POST /v1/text-to-speech/{voice_id}/with-timestamps` → `{ audio_base64, alignment: { characters[], character_start_times_seconds[], character_end_times_seconds[] }, normalized_alignment }`. Body: `text`, `model_id`, `voice_settings` (`stability`, `similarity_boost`, `style`, `speed` 0.7–1.2), `seed`, `previous_text`/`next_text`.
- v3/v4 ignore SSML `<break>`; use audio tags (`[whispers]`, `[excited]`, descriptive `[low, tense voice]`) and punctuation (ellipses, CAPS). Tags direct delivery without being spoken, so the story text stays verbatim. Descriptive tags avoid being read as sound-effect cues.
- Sound effects: `POST /v1/sound-generation`, model `eleven_text_to_sound_v2`, `duration_seconds` 0.5–30, `loop: true` for seamless loops, `prompt_influence` 0–1 (default 0.3). Returns MP3.
- Music: `music.compose` with `prompt` or `composition_plan`, `music_length_ms`, `model_id: "music_v2_5"`. Paid plans only. Naming artists/songs returns `bad_prompt`.
- Output format `mp3_44100_128` default; 192 kbps needs Creator+.

## Hosting (verified 2026-10-02)
- GitHub Pages: free for public repos; site ≤ 1 GB; soft 100 GB/month bandwidth; Actions deploy avoids the 10 builds/hour soft limit. `gh` logged in as `Arshad-Kamal`.
- Cloudflare Pages free (fallback): 20,000 files, 25 MiB per file.

<!-- 2026-10-02 · Verified version facts and gotchas, from docs fetched and checks run in session "Water Born 3D storybook". Re-verify on version bumps. -->
# Stack notes

## Toolchain (verified 2026-10-02)
- Node v24.18.0 runs `.ts` tests directly (`node --test "tests/**/*.test.ts"`, built-in type stripping). Imports of `.ts` files need the explicit extension + `allowImportingTsExtensions` in tsconfig; `erasableSyntaxOnly` keeps code strippable (no `enum`, no parameter properties).
- TypeScript 7.0.2 (`tsc --noEmit`), `@types/node@24`. Installed: three 0.186.1 (+ @types/three 0.186.0), vite 8.3.2.
- ffmpeg/ffprobe on PATH (used by `scripts/master-audio.ts`). Gotchas: `ffprobe` on an MP3 piped via stdin reports duration `N/A`, so probe files on disk; the `ebur128` filter reports on stderr, so read it with `spawnSync`, not `execFileSync`.

## ElevenLabs API (docs read 2026-10-02, elevenlabs.io/docs)
- Auth header `xi-api-key`; key lives only in `.env` as `ELEVENLABS_API_KEY`.
- TTS models: `eleven_v4` (flagship, 10,000 char limit, audio tags), `eleven_v3` (5,000), `eleven_multilingual_v2` (10,000).
- Smoke 2026-10-02: `eleven_v4` works on `with-timestamps` (200). Alignment includes the audio-tag characters at ~0 s (`[tense, urgent] ` = 16 chars, speech starts 0.08 s), so strip the tag prefix length when mapping times to page text. Sentence starts landed at 0.08 / 2.80 / 5.04 s for a 124-char line (7.3 s audio).
- Arshad's key is scoped: `/v1/user/subscription` (needs `user_read`) and `/v1/models` (`models_read`) return 401; `/v1/voices`, `/v1/shared-voices`, TTS and SFX work. Voice-library voices can be used by `voice_id` directly without adding them to the account.
- Narrator voice chosen: Valf (`loY1uopAz31XyhAEhNSa`, shared library, "very young, energetic, playful; animation / children's content").
- `POST /v1/text-to-speech/{voice_id}/with-timestamps` → `{ audio_base64, alignment: { characters[], character_start_times_seconds[], character_end_times_seconds[] }, normalized_alignment }`. Body: `text`, `model_id`, `voice_settings` (`stability`, `similarity_boost`, `style`, `speed` 0.7–1.2), `seed`, `previous_text`/`next_text`.
- v3/v4 ignore SSML `<break>`; use audio tags (`[whispers]`, `[excited]`, descriptive `[low, tense voice]`) and punctuation (ellipses, CAPS). Tags direct delivery without being spoken, so the story text stays verbatim. Descriptive tags avoid being read as sound-effect cues.
- Sound effects: `POST /v1/sound-generation`, model `eleven_text_to_sound_v2`, `duration_seconds` 0.5–30, `loop: true` for seamless loops, `prompt_influence` 0–1 (default 0.3). Returns MP3.
- Music: `POST /v1/music` body `prompt` | `composition_plan`, `music_length_ms` (3,000–600,000), `model_id: "music_v2_5"`, `force_instrumental: true`; returns the audio file. Paid plans only (works on Arshad's key). Naming artists/songs returns `bad_prompt`. A 70 s track took ~9 s to generate (2026-10-03).
- Raw loudness varies wildly per generation (SFX -7 to -53 LUFS, narration -21 to -29, music -12 to -25), so everything is mastered to fixed targets before use.
- Output format `mp3_44100_128` default; 192 kbps needs Creator+.

## Hosting (verified 2026-10-02)
- GitHub Pages: free for public repos; site ≤ 1 GB; soft 100 GB/month bandwidth; Actions deploy avoids the 10 builds/hour soft limit. `gh` logged in as `Arshad-Kamal`.
- Cloudflare Pages free (fallback): 20,000 files, 25 MiB per file.

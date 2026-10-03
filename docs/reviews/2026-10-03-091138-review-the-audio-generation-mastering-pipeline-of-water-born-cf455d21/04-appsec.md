# Security review: Water Born audio generation and mastering pipeline

2026-10-03 · `5d2660f..2c72c55` (single commit `2c72c55`) · lens: application security

## Verdict

I found no security defects in this range. The ElevenLabs key is read only from `process.env` and sent only in the `xi-api-key` header. It is never logged, interpolated into a URL or error message, or written to disk. `.env` is gitignored and has never appeared in git history. Vite's default `VITE_` prefix keeps the key out of the client bundle. Every subprocess call uses an argv array, so no shell is involved, and the file paths come from constants or the repo's own `audio-src/` folder. My only findings are two stale comments, which belong to the readability lens; I verified them and list them below without pursuing further.

## Findings

### Minor (outside the security lens, routed to readability-and-maintainability)

- **`scripts/narration-direction.ts:3`**: the comment says "tests/narration-direction.test.ts checks every page has exactly one entry per block", but that file doesn't exist. `tests/` contains only `narration.test.ts`, `scenes.test.ts` and `story-verbatim.test.ts`, and the check is in `tests/narration.test.ts:8-10`. **Fix:** point the comment at `tests/narration.test.ts`.
- **`src/content/narration-timing.ts:1`**: the comment says the timing JSON is "written by scripts/gen-audio.ts". It is actually written by `scripts/master-audio.ts:73`; `gen-audio.ts` writes only `*.alignment.json` into `audio-src/`. **Fix:** change it to `scripts/master-audio.ts`.

### Security checks that passed (no action)

- **Secret handling** (`scripts/gen-audio.ts:17-23`): the key is checked for presence, then used only in the request header. The error path (`gen-audio.ts:25`) includes the HTTP status and up to 400 characters of the response body, but not the request headers, so the key can't leak through it. `package.json` loads it with `node --env-file=.env`, so it never appears on a command line. `.gitignore` lists `.env`, and `git log --all -- .env` returns nothing. A grep for `sk_…`-shaped tokens, `envPrefix` and `loadEnv` across the non-mp3 files found nothing. `vite.config.ts` keeps the default env prefix.
- **Command and argument injection, CWE-78/CWE-88** (`scripts/master-audio.ts:23,33,40-42`): `spawnSync` and `execFileSync` take argv arrays without `shell: true`. The file names come from `readdirSync` on the repo's own `audio-src/{sfx,music}` or from `book.pages` ids, and are converted to absolute paths with `fileURLToPath`, so a name can't start with `-` and be read as an ffmpeg option. The `volume=` filter argument is a number from `toFixed(2)`.
- **Path traversal, CWE-22** (`scripts/gen-audio.ts:29-33`): output names come from `book.pages[].id` and the `SFX`/`MUSIC` keys. The argv `only` values work purely as a filter and are never used to build a path.
- **SSRF** (`scripts/gen-audio.ts:11,43`): the host is a constant, and `VOICE_ID` is a constant interpolated into the path.
- **Deserialization**: `JSON.parse` reads only committed `audio-src/*.alignment.json` written by this same script. That is local trusted data, so it isn't a trust boundary.

## Open questions

None within this lens.

## What I did not review

I did not open the binary mp3 files or the generated JSON under `audio-src/` and `public/audio/` (out of scope by instruction); I only grepped the non-mp3 files for secret patterns. I didn't run the code, the tests, `npm run verify` or ffmpeg. Outside this lens I read but did not evaluate in depth:

- **Alignment-to-timing correctness:** the `spoken !== input.text` guard plus code-unit offsets look right for the current text, which has no astral-plane characters.
- **Paid-credit failure modes:** `gen-audio.ts:49-50` writes the mp3 before the alignment file. If the alignment write failed, a rerun would regenerate and overwrite that page's mp3. This only happens if the API returns no alignment, which I couldn't confirm either way.
- **Test adequacy, loudness targets and the `/v1/music` response format:** these belong to the logic and edge-case scopes.

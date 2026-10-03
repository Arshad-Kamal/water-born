// Generates the paid ElevenLabs originals once into audio-src/ (committed). Existing
// files are never regenerated: credits are limited, so delete a file by hand to redo it.
// Run scripts/master-audio.ts afterwards to build public/audio/.
// Usage: node --env-file=.env scripts/gen-audio.ts <narration|sfx|music|all> [id ...]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { book } from '../src/content/book.ts';
import { MUSIC, SFX } from '../src/content/sound.ts';
import { DIRECTION } from './narration-direction.ts';
import { buildNarrationInput, pageText, type Alignment } from './narration.ts';

const API = 'https://api.elevenlabs.io';
const SRC = new URL('../audio-src/', import.meta.url);
const VOICE_ID = 'loY1uopAz31XyhAEhNSa';
const TTS_MODEL = 'eleven_v4';
const SEED = 4242;

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing: run with node --env-file=.env');

async function post(path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${(await res.text()).slice(0, 400)}`);
  return res;
}

function srcPath(kind: string, file: string): URL {
  const folder = new URL(`${kind}/`, SRC);
  mkdirSync(folder, { recursive: true });
  return new URL(file, folder);
}

async function narration(only: readonly string[]): Promise<void> {
  for (const [i, page] of book.pages.entries()) {
    if (only.length && !only.includes(page.id)) continue;
    const mp3 = srcPath('narration', `${page.id}.mp3`);
    const alignmentFile = srcPath('narration', `${page.id}.alignment.json`);
    if (existsSync(mp3) && existsSync(alignmentFile)) continue;
    const input = buildNarrationInput(page, DIRECTION[page.id] ?? []);
    const res = await post(`/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`, {
      text: input.text,
      model_id: TTS_MODEL,
      seed: SEED,
      previous_text: pageText(book.pages[i - 1]),
      next_text: pageText(book.pages[i + 1]),
    });
    const data = (await res.json()) as { audio_base64: string; alignment: Alignment };
    writeFileSync(mp3, Buffer.from(data.audio_base64, 'base64'));
    writeFileSync(alignmentFile, JSON.stringify(data.alignment));
    console.log(`narration ${page.id} (${input.text.length} chars)`);
  }
}

async function sfx(only: readonly string[]): Promise<void> {
  for (const [id, spec] of Object.entries(SFX)) {
    if (only.length && !only.includes(id)) continue;
    const file = srcPath('sfx', `${id}.mp3`);
    if (existsSync(file)) continue;
    const res = await post('/v1/sound-generation?output_format=mp3_44100_128', {
      text: spec.prompt,
      duration_seconds: spec.seconds,
      loop: 'loop' in spec ? spec.loop : false,
      prompt_influence: 0.5,
      model_id: 'eleven_text_to_sound_v2',
    });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`sfx ${id}`);
  }
}

async function music(only: readonly string[]): Promise<void> {
  for (const [id, spec] of Object.entries(MUSIC)) {
    if (only.length && !only.includes(id)) continue;
    const file = srcPath('music', `${id}.mp3`);
    if (existsSync(file)) continue;
    const res = await post('/v1/music?output_format=mp3_44100_128', {
      prompt: spec.prompt,
      music_length_ms: spec.seconds * 1000,
      model_id: 'music_v2_5',
      force_instrumental: true,
    });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`music ${id}`);
  }
}

const [kind = '', ...only] = process.argv.slice(2);
const jobs: Record<string, (only: readonly string[]) => Promise<void>> = { narration, sfx, music };
if (kind === 'all') for (const job of Object.values(jobs)) await job(only);
else if (jobs[kind]) await jobs[kind](only);
else throw new Error('Usage: gen-audio.ts <narration|sfx|music|all> [id ...]');

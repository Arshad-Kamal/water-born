// Builds public/audio/ from the paid originals in audio-src/ (no API calls, safe to rerun).
// Each file gets one static gain to a loudness target, never dynamic compression,
// so seamless loops stay seamless. Narration also gets its page timing JSON.
// Usage: node scripts/master-audio.ts   (needs ffmpeg/ffprobe on PATH)
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { book } from '../src/content/book.ts';
import { SFX } from '../src/content/sound.ts';
import { DIRECTION } from './narration-direction.ts';
import { buildNarrationInput, toTiming, type Alignment } from './narration.ts';

const SRC = new URL('../audio-src/', import.meta.url);
const OUT = new URL('../public/audio/', import.meta.url);
const MAX_GAIN_DB = 20;

/** Integrated loudness targets (LUFS). Beds sit under the narration. */
const TARGET = { narration: -16, sfx: -17, loop: -26, music: -21 } as const;

const path = (url: URL): string => fileURLToPath(url);

function loudness(file: URL): number {
  // ebur128 reports on stderr.
  const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path(file), '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`ffmpeg ebur128 failed for ${file.pathname}: ${run.stderr.slice(-300)}`);
  const log = run.stderr;
  const summary = log.slice(log.lastIndexOf('Summary:'));
  const match = /I:\s+(-?[\d.]+) LUFS/.exec(summary);
  if (!match) throw new Error(`no loudness reading for ${file.pathname}`);
  return Number(match[1]);
}

function duration(file: URL): number {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path(file)]).toString();
  const seconds = Number(out.trim());
  if (!Number.isFinite(seconds)) throw new Error(`no duration for ${file.pathname}`);
  return seconds;
}

function master(src: URL, out: URL, target: number): void {
  const measured = loudness(src);
  const gain = Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, target - measured));
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path(src),
    '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false`,
    '-c:a', 'libmp3lame', '-b:a', '128k', path(out)]);
  console.log(`${out.pathname.split('/audio/')[1]}: ${measured.toFixed(1)} LUFS ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB`);
}

function folder(base: URL, kind: string): URL {
  const url = new URL(`${kind}/`, base);
  mkdirSync(url, { recursive: true });
  return url;
}

const loops = new Set(Object.entries(SFX).filter(([, spec]) => 'loop' in spec && spec.loop).map(([id]) => id));

for (const kind of ['sfx', 'music'] as const) {
  const src = folder(SRC, kind);
  const out = folder(OUT, kind);
  for (const file of readdirSync(src).filter((f) => f.endsWith('.mp3'))) {
    const target = kind === 'music' ? TARGET.music : loops.has(file.replace('.mp3', '')) ? TARGET.loop : TARGET.sfx;
    master(new URL(file, src), new URL(file, out), target);
  }
}

const narrationSrc = folder(SRC, 'narration');
const narrationOut = folder(OUT, 'narration');
for (const page of book.pages) {
  const mp3 = new URL(`${page.id}.mp3`, narrationOut);
  master(new URL(`${page.id}.mp3`, narrationSrc), mp3, TARGET.narration);
  const alignment = JSON.parse(readFileSync(new URL(`${page.id}.alignment.json`, narrationSrc), 'utf8')) as Alignment;
  const input = buildNarrationInput(page, DIRECTION[page.id] ?? []);
  writeFileSync(new URL(`${page.id}.json`, narrationOut), JSON.stringify(toTiming(page, input, alignment, duration(mp3))));
}

// Builds public/audio/ from the paid originals in audio-src/ (no API calls, safe to rerun).
// Loops and music get one static gain, capped by their true peak so they cannot clip,
// and nothing dynamic, so seamless loops stay seamless. Narration and one-shot SFX
// (often boosted a lot) also pass a delay-compensated safety limiter.
// Narration also gets its page timing JSON.
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

/** Integrated loudness (LUFS) and true peak (dBTP) of a file. */
function measure(file: URL): { loudness: number; peak: number } {
  // ebur128 reports on stderr.
  const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path(file), '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`ffmpeg ebur128 failed for ${path(file)}: ${run.stderr.slice(-300)}`);
  const summary = run.stderr.slice(run.stderr.lastIndexOf('Summary:'));
  const loudness = /I:\s+(-?[\d.]+) LUFS/.exec(summary);
  const peak = /Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(summary);
  if (!loudness || !peak) throw new Error(`no loudness/peak reading for ${path(file)}`);
  return { loudness: Number(loudness[1]), peak: peak[1] === '-inf' ? -Infinity : Number(peak[1]) };
}

function duration(file: URL): number {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path(file)]).toString();
  const seconds = Number(out.trim());
  if (!Number.isFinite(seconds)) throw new Error(`no duration for ${path(file)}`);
  return seconds;
}

const PEAK_CEILING_DB = -1;

function master(src: URL, out: URL, target: number, staticOnly: boolean): void {
  const { loudness, peak } = measure(src);
  let gain = Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, target - loudness));
  if (staticOnly) gain = Math.min(gain, PEAK_CEILING_DB - peak);
  const filter = staticOnly ? `volume=${gain.toFixed(2)}dB` : `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false:latency=true`;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path(src), '-af', filter, '-c:a', 'libmp3lame', '-b:a', '128k', path(out)]);
  console.log(`${path(out).split('/audio/')[1]}: ${loudness.toFixed(1)} LUFS, peak ${peak.toFixed(1)}, ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB${staticOnly ? '' : ' +limiter'}`);
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
    const isLoop = loops.has(file.replace('.mp3', ''));
    const target = kind === 'music' ? TARGET.music : isLoop ? TARGET.loop : TARGET.sfx;
    master(new URL(file, src), new URL(file, out), target, kind === 'music' || isLoop);
  }
}

const narrationSrc = folder(SRC, 'narration');
const narrationOut = folder(OUT, 'narration');
for (const page of book.pages) {
  const mp3 = new URL(`${page.id}.mp3`, narrationOut);
  master(new URL(`${page.id}.mp3`, narrationSrc), mp3, TARGET.narration, false);
  const alignment = JSON.parse(readFileSync(new URL(`${page.id}.alignment.json`, narrationSrc), 'utf8')) as Alignment;
  const input = buildNarrationInput(page, DIRECTION[page.id] ?? []);
  writeFileSync(new URL(`${page.id}.json`, narrationOut), JSON.stringify(toTiming(page, input, alignment, duration(mp3))));
}

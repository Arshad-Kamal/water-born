// Builds public/art/ from Arshad's raw images in assets-in/ (free, safe to rerun).
// Each recognised file becomes <name>.webp; public/art/manifest.json lists every
// picture that exists, so the reader can fall back to placeholders for the rest.
// Usage: node scripts/build-art.ts   (needs ffmpeg with libwebp on PATH)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../assets-in/', import.meta.url);
const OUT = new URL('../public/art/', import.meta.url);
const QUALITY = '82';
const HEROES = ['kyle', 'logan', 'ruby', 'zoro', 'flora'];

/** ffmpeg filter per kind of picture; sizes match how big each is ever shown. */
const FILTER = {
  page: "scale=-2:'min(1536,ih)'",
  wide: "scale='min(1920,iw)':-2",
  plate: "scale='min(960,iw)':-2",
  endpaper: "scale='min(1024,iw)':-2",
  // Character sheets are 1264x848 with the front full-body view in the left third;
  // this crops head-to-knee at the card's 1:1.42 shape, clear of the next view.
  card: 'crop=396:562:6:30,scale=340:-2',
} as const;

interface Job {
  readonly name: string;
  readonly file: string;
  readonly filter: string;
}

function jobFor(file: string): Job | undefined {
  const base = file.replace(/\.(jpe?g|png|webp)$/i, '');
  if (base === file) return undefined;
  const wide = /^(p\d\d)-.+-wide$/.exec(base);
  if (wide) return { name: `${wide[1]}-wide`, file, filter: FILTER.wide };
  const page = /^(p\d\d)-.+$/.exec(base);
  if (page) return { name: page[1]!, file, filter: FILTER.page };
  if (base === 'cover') return { name: base, file, filter: FILTER.page };
  if (base === 'endpaper') return { name: base, file, filter: FILTER.endpaper };
  if (/^plate-ch[1-3]$/.test(base)) return { name: base, file, filter: FILTER.plate };
  const hero = /^char-(.+)$/.exec(base)?.[1];
  if (hero && HEROES.includes(hero)) return { name: `card-${hero}`, file, filter: FILTER.card };
  return undefined;
}

const files = existsSync(SRC) ? readdirSync(SRC).sort() : [];
const jobs = files.flatMap((f) => jobFor(f) ?? []);
// The chosen style test is the page 3 painting until a dedicated p03 file arrives.
if (!jobs.some((j) => j.name === 'p03') && files.includes('style-a-painted.jpg')) {
  jobs.push({ name: 'p03', file: 'style-a-painted.jpg', filter: FILTER.page });
}

const seen = new Map<string, string>();
for (const job of jobs) {
  const clash = seen.get(job.name);
  if (clash) throw new Error(`${job.file} and ${clash} both map to ${job.name}; remove one from assets-in/`);
  seen.set(job.name, job.file);
}

mkdirSync(OUT, { recursive: true });
for (const job of jobs) {
  const out = fileURLToPath(new URL(`${job.name}.webp`, OUT));
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', fileURLToPath(new URL(job.file, SRC)), '-vf', job.filter, '-c:v', 'libwebp', '-quality', QUALITY, '-compression_level', '6', out]);
  console.log(`${job.file} -> art/${job.name}.webp`);
}

const names = readdirSync(OUT).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -'.webp'.length)).sort();
writeFileSync(new URL('manifest.json', OUT), `${JSON.stringify(names)}\n`);
console.log(`manifest: ${names.length} pictures`);

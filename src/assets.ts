// Art arrives over time; public/art/manifest.json (written by scripts/build-art.ts)
// lists what exists, so missing pictures fall back to painted placeholders quietly.
const BASE = import.meta.env.BASE_URL;

let available = new Set<string>();
const images = new Map<string, Promise<HTMLImageElement | undefined>>();

export async function loadManifest(): Promise<void> {
  try {
    const res = await fetch(`${BASE}art/manifest.json`);
    if (res.ok) available = new Set((await res.json()) as string[]);
  } catch (e) {
    console.warn('art manifest unavailable', e);
  }
}

export const hasArt = (name: string): boolean => available.has(name);
export const artUrl = (name: string): string => `${BASE}art/${name}.webp`;

/** Decoded image for an art name, or undefined when that picture does not exist yet. */
export function artImage(name: string): Promise<HTMLImageElement | undefined> {
  let image = images.get(name);
  if (!image) {
    image = hasArt(name)
      ? new Promise((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(undefined);
          img.src = artUrl(name);
        })
      : Promise.resolve(undefined);
    images.set(name, image);
  }
  return image;
}

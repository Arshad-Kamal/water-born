// What is printed on each face of each leaf. Leaf 0 is the hard cover (cover / endpaper).
// Leaf 1 carries the title page and, on its back, page 1's picture. Leaf k+1 carries
// page k's text and, on its back, page k+1's picture; the last leaf's back is the credits.
// So at spread s (leaves turned) the reader sees picture + text of page index s-2.
import * as THREE from 'three';
import { artImage } from './assets.ts';
import { book } from './content/book.ts';
import { SCENES } from './content/scenes.ts';
import type { Face, SurfaceSource } from './engine/book3d.ts';
import { inkMaterial, PAPER_GLOW, type InkUniforms } from './engine/ink.ts';
import { artPage, cover, creditsPage, endpaper, layoutTextPage, leather, paper, titlePage, type Hotspot } from './engine/pages.ts';
import { gradeSky } from './engine/stage.ts';
import { chapterOf } from './ui/hud.ts';

/** Paper leaves after the cover: title leaf + one per story page. */
export const PAPER_LEAVES = book.pages.length + 1;
const FIRST_PAGE_SPREAD = 2;
/** Spread showing the endpaper and the title page, right after the cover opens. */
export const TITLE_SPREAD = FIRST_PAGE_SPREAD - 1;

export const spreadOf = (pageIndex: number): number => pageIndex + FIRST_PAGE_SPREAD;

/** Story page index read at a spread, or undefined for the cover, title and credits spreads. */
export function pageAt(spread: number): number | undefined {
  const index = spread - FIRST_PAGE_SPREAD;
  return index >= 0 && index < book.pages.length ? index : undefined;
}

/** Picture used for the cover until its own painting exists. */
const COVER_FALLBACK = 'p03';
const MAX_ANISOTROPY = 8;

function texture(canvas: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

/** A printed surface that keeps a little of its own colour whatever the scene light. */
function printed(map: THREE.Texture, params: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map, roughness: 0.88, emissiveMap: map, emissive: new THREE.Color().setScalar(PAPER_GLOW), ...params });
}

/** A printed material that owns its texture, so the book can free both when the leaf leaves its window. */
function owned(map: THREE.Texture, params: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const m = printed(map, params);
  m.userData.owned = [map];
  return m;
}

/** The cover painting, or a stand-in until it exists. */
async function coverArt(): Promise<HTMLImageElement | undefined> {
  return (await artImage('cover')) ?? artImage(COVER_FALLBACK);
}

const size = (img: HTMLImageElement | undefined): [number, number] => [img?.naturalWidth ?? 1, img?.naturalHeight ?? 1];

export class Surfaces {
  /** Plain parchment, shared by every text page and the unloaded leaves; never disposed. */
  readonly plain: THREE.MeshStandardMaterial;
  readonly coverBoard: THREE.MeshStandardMaterial;
  private readonly paper: THREE.CanvasTexture;
  private readonly anisotropy: number;
  /** Latest reveal uniform per page index (a page's material is rebuilt when it re-enters the window). */
  private readonly live = new Map<number, InkUniforms>();
  private readonly revealed = new Map<number, number>();
  private readonly hotspotsOf = new Map<number, readonly Hotspot[]>();
  private coverMap?: Promise<THREE.CanvasTexture>;
  private endpaper?: Promise<THREE.Material>;

  constructor(maxAnisotropy: number) {
    this.anisotropy = Math.min(MAX_ANISOTROPY, maxAnisotropy);
    this.paper = texture(paper(true), this.anisotropy);
    this.plain = printed(this.paper, { roughness: 0.9 });
    this.coverBoard = new THREE.MeshStandardMaterial({ map: texture(leather(), 1), roughness: 0.72 });
  }

  readonly source: SurfaceSource = (leaf, face) => this.make(leaf, face);

  /** Inside of both covers, shared; never disposed. */
  endpaperMaterial(): Promise<THREE.Material> {
    this.endpaper ??= artImage('endpaper').then((img) => printed(texture(endpaper(img), 1)));
    return this.endpaper;
  }

  /** The painted front cover, shared by the cover leaf and its reflection; never disposed. */
  coverTexture(): Promise<THREE.CanvasTexture> {
    this.coverMap ??= coverArt().then((art) => texture(cover(art, ...size(art), book.title, book.author), this.anisotropy));
    return this.coverMap;
  }

  /** Sets how far page `index` has inked in (character index; large = fully read). */
  setReveal(index: number, value: number): void {
    this.revealed.set(index, value);
    const uniforms = this.live.get(index);
    if (uniforms) uniforms.reveal.value = value;
  }

  /** Where sound words sit on page `index`, once its text has been laid out. */
  hotspots(index: number): readonly Hotspot[] {
    return this.hotspotsOf.get(index) ?? [];
  }

  private async make(leaf: number, face: Face): Promise<THREE.Material> {
    if (leaf === 0) return face === 'front' ? this.cover() : this.endpaperMaterial();
    if (face === 'front') return leaf === 1 ? owned(texture(titlePage(book.author, book.title), this.anisotropy)) : this.textPage(leaf - FIRST_PAGE_SPREAD);
    const pictureIndex = leaf - 1;
    return pictureIndex < book.pages.length ? this.picture(pictureIndex) : owned(texture(creditsPage(book.author), this.anisotropy));
  }

  private async cover(): Promise<THREE.Material> {
    return printed(await this.coverTexture(), { roughness: 0.6, metalness: 0.08 });
  }

  private async picture(index: number): Promise<THREE.Material> {
    const page = book.pages[index]!;
    const img = await artImage(page.id);
    return owned(texture(artPage(img, ...size(img), gradeSky(SCENES[page.scene]!.grade)), this.anisotropy), { roughness: 0.8 });
  }

  private textPage(index: number): THREE.Material {
    const layout = layoutTextPage(book.pages[index]!, index + 1, chapterOf(index).number);
    const ink = texture(layout.ink, this.anisotropy);
    const mask = new THREE.CanvasTexture(layout.mask);
    mask.magFilter = THREE.NearestFilter;
    mask.minFilter = THREE.NearestFilter;
    mask.generateMipmaps = false;
    const [material, uniforms] = inkMaterial(this.paper, ink, mask);
    uniforms.reveal.value = this.revealed.get(index) ?? 0;
    material.userData.owned = [ink, mask];
    this.live.set(index, uniforms);
    this.hotspotsOf.set(index, layout.hotspots);
    return material;
  }
}

import * as THREE from 'three';
import { easeInOutCubic } from './ticker.ts';

export const PAGE_W = 1;
export const PAGE_H = 1.5;
const COVER_W = 1.03;
const COVER_H = 1.56;
const SEGMENTS = 28;
const GAP = 0.0028;
const BASE_Z = 0.014;
const CURL = 0.8;
const TURN_SECONDS = 1.05;
const FAST_TURN_SECONDS = 0.55;
/** Leaves kept textured on each side of the current spread; the rest share a plain material. */
const WINDOW_BEHIND = 2;
const WINDOW_AHEAD = 2;

export type Face = 'front' | 'back';

/** Supplies the material for one face of one leaf. Leaf 0 is the hard cover. */
export type SurfaceSource = (leaf: number, face: Face) => Promise<THREE.Material>;

export interface PageHit {
  readonly leaf: number;
  readonly face: Face;
  readonly uv: THREE.Vector2;
}

interface Leaf {
  readonly mesh: THREE.SkinnedMesh;
  readonly bones: THREE.Bone[];
  readonly rigid: boolean;
  progress: number;
  target: number;
  seconds: number;
  /** Seconds to wait before starting toward target (staggered multi-page turns). */
  delay: number;
  loaded: boolean;
  loading: number;
}

function leafGeometry(width: number, height: number, depth: number): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(width, height, depth, SEGMENTS, 1, 1);
  g.translate(width / 2, 0, 0);
  const pos = g.attributes.position!;
  const segW = width / SEGMENTS;
  const skinIndex: number[] = [];
  const skinWeight: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const s = pos.getX(i) / segW;
    const bone = Math.min(Math.floor(s), SEGMENTS - 1);
    const w = s - bone;
    skinIndex.push(bone, bone + 1, 0, 0);
    skinWeight.push(1 - w, w, 0, 0);
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  return g;
}

const curlWeights = Array.from({ length: SEGMENTS + 1 }, (_, i) => (i === 0 ? 0 : (i / SEGMENTS) ** 1.6));
const curlSum = curlWeights.reduce((a, b) => a + b, 0);

function edgeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 64; y++) {
    ctx.fillStyle = y % 2 ? '#e6d4ae' : '#cdb68b';
    ctx.fillRect(0, y, 8, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Book {
  readonly group = new THREE.Group();
  readonly leafCount: number;
  onTurnStart: (from: number, to: number) => void = () => undefined;
  onSettle: (spread: number) => void = () => undefined;
  /** 0..1, a small lift of the next page corner to invite a turn. */
  peek = 0;

  private readonly leaves: Leaf[] = [];
  private readonly placeholder: THREE.Material;
  private readonly edge: THREE.Material;
  private readonly raycaster = new THREE.Raycaster();
  private settled = 0;
  private dragging?: { leaf: Leaf; dir: 1 | -1 };
  private wasMoving = false;
  private readonly surface: SurfaceSource;

  constructor(
    paperLeafCount: number,
    surface: SurfaceSource,
    coverBoard: THREE.Material,
    insideBackCover: Promise<THREE.Material>,
    plainPaper: THREE.Material,
  ) {
    this.surface = surface;
    this.leafCount = paperLeafCount + 1;
    this.placeholder = plainPaper;
    this.edge = new THREE.MeshStandardMaterial({ map: edgeTexture(), roughness: 0.95 });
    this.group.rotation.x = -0.5;

    const paperGeo = leafGeometry(PAGE_W, PAGE_H, 0.0016);
    const coverGeo = leafGeometry(COVER_W, COVER_H, 0.014);
    for (let i = 0; i < this.leafCount; i++) {
      const rigid = i === 0;
      const sides = rigid ? coverBoard : this.edge;
      this.leaves.push(this.makeLeaf(rigid ? coverGeo : paperGeo, [sides, sides, sides, sides, this.placeholder, this.placeholder], rigid));
    }

    const board = new THREE.Mesh(new THREE.BoxGeometry(COVER_W, COVER_H, 0.014), [coverBoard, coverBoard, coverBoard, coverBoard, this.placeholder, coverBoard]);
    board.position.set(COVER_W / 2, 0, 0);
    board.receiveShadow = true;
    this.group.add(board);
    void insideBackCover.then((m) => {
      (board.material as THREE.Material[])[4] = m;
    });
    for (const leaf of this.leaves) this.pose(leaf);
    this.refreshWindow();
  }

  /** Number of leaves turned to the left: 0 = closed, leafCount = finished. */
  get spread(): number {
    return this.settled;
  }

  get isMoving(): boolean {
    return this.wasMoving || this.dragging !== undefined;
  }

  /** World-space centre of the left (-1) or right (+1) page, or the whole spread (0). */
  pagePoint(side: -1 | 0 | 1, out = new THREE.Vector3()): THREE.Vector3 {
    this.group.updateMatrixWorld();
    return out.set(side * PAGE_W * 0.5, 0, BASE_Z).applyMatrix4(this.group.matrixWorld);
  }

  /** World-space point on a page face from UV (u to the right, v up), for the given side. */
  pageUvPoint(side: -1 | 1, u: number, v: number, out = new THREE.Vector3()): THREE.Vector3 {
    this.group.updateMatrixWorld();
    const x = side === 1 ? u * PAGE_W : -PAGE_W + u * PAGE_W;
    return out.set(x, (v - 0.5) * PAGE_H, BASE_Z + 0.03).applyMatrix4(this.group.matrixWorld);
  }

  turn(dir: 1 | -1): boolean {
    const target = this.targetSpread() + dir;
    if (target < 0 || target > this.leafCount) return false;
    this.turnTo(target);
    return true;
  }

  turnTo(target: number, fast = false): void {
    const from = this.targetSpread();
    if (target === from || this.dragging) return;
    this.onTurnStart(from, target);
    const dir = target > from ? 1 : -1;
    let k = 0;
    for (let i = from; i !== target; i += dir) {
      const leaf = this.leaves[dir === 1 ? i : i - 1]!;
      leaf.target = dir === 1 ? 1 : 0;
      leaf.seconds = fast || Math.abs(target - from) > 1 ? FAST_TURN_SECONDS : TURN_SECONDS;
      leaf.delay = k++ * 0.09;
    }
    this.refreshWindow(target);
  }

  /** Starts a finger drag on the page that `dir` would turn. Returns false if there is none. */
  beginDrag(dir: 1 | -1): boolean {
    if (this.isMoving) return false;
    const index = dir === 1 ? this.settled : this.settled - 1;
    const leaf = this.leaves[index];
    if (!leaf) return false;
    this.dragging = { leaf, dir };
    this.peek = 0;
    return true;
  }

  /** amount 0..1 of the way through the turn. */
  drag(amount: number): void {
    if (!this.dragging) return;
    const a = THREE.MathUtils.clamp(amount, 0, 1);
    this.dragging.leaf.progress = this.dragging.dir === 1 ? a : 1 - a;
    this.dragging.leaf.target = this.dragging.leaf.progress;
  }

  endDrag(commit: boolean): void {
    if (!this.dragging) return;
    const { leaf, dir } = this.dragging;
    this.dragging = undefined;
    const from = this.settled;
    const done = commit ? (dir === 1 ? 1 : 0) : dir === 1 ? 0 : 1;
    leaf.target = done;
    leaf.seconds = TURN_SECONDS * 0.7;
    leaf.delay = 0;
    if (commit) {
      this.onTurnStart(from, from + dir);
      this.refreshWindow(from + dir);
    }
    this.wasMoving = true;
  }

  hit(ndc: THREE.Vector2, camera: THREE.Camera): PageHit | undefined {
    this.raycaster.setFromCamera(ndc, camera);
    const hits = this.raycaster.intersectObjects(this.leaves.map((l) => l.mesh), false);
    for (const h of hits) {
      const leaf = this.leaves.findIndex((l) => l.mesh === h.object);
      const mi = h.face?.materialIndex;
      if (leaf < 0 || !h.uv || (mi !== 4 && mi !== 5)) continue;
      return { leaf, face: mi === 4 ? 'front' : 'back', uv: h.uv.clone() };
    }
    return undefined;
  }

  update(dt: number): void {
    let moving = this.dragging !== undefined;
    for (const leaf of this.leaves) {
      if (leaf.delay > 0) {
        leaf.delay -= dt;
        moving = true;
      } else if (leaf.progress !== leaf.target && leaf !== this.dragging?.leaf) {
        const step = dt / leaf.seconds;
        leaf.progress = leaf.target > leaf.progress ? Math.min(leaf.target, leaf.progress + step) : Math.max(leaf.target, leaf.progress - step);
        moving = true;
      }
      this.pose(leaf);
    }
    if (this.wasMoving && !moving) {
      this.settled = this.targetSpread();
      for (const leaf of this.leaves) leaf.mesh.computeBoundingSphere();
      this.refreshWindow();
      this.onSettle(this.settled);
    }
    this.wasMoving = moving;
  }

  private targetSpread(): number {
    return this.leaves.filter((l) => l.target >= 0.5).length;
  }

  private makeLeaf(geometry: THREE.BoxGeometry, materials: THREE.Material[], rigid: boolean): Leaf {
    const bones: THREE.Bone[] = [];
    const segW = (rigid ? COVER_W : PAGE_W) / SEGMENTS;
    for (let i = 0; i <= SEGMENTS; i++) {
      const b = new THREE.Bone();
      if (i > 0) {
        b.position.x = segW;
        bones[i - 1]!.add(b);
      }
      bones.push(b);
    }
    const mesh = new THREE.SkinnedMesh(geometry, materials);
    mesh.add(bones[0]!);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    return { mesh, bones, rigid, progress: 0, target: 0, seconds: TURN_SECONDS, delay: 0, loaded: false, loading: 0 };
  }

  private pose(leaf: Leaf): void {
    const index = this.leaves.indexOf(leaf);
    const isNext = index === this.settled && !this.isMovingNow();
    const peek = isNext && !leaf.rigid ? this.peek * 0.045 : 0;
    const p = easeInOutCubic(leaf.progress);
    const turning = Math.sin(Math.PI * leaf.progress);
    const bend = leaf.rigid ? 0 : turning * CURL * (leaf.target >= leaf.progress ? 1 : -1) + peek * 6;
    leaf.bones[0]!.rotation.y = -Math.PI * p - peek;
    for (let i = 1; i <= SEGMENTS; i++) leaf.bones[i]!.rotation.y = (bend * curlWeights[i]!) / curlSum;
    const n = this.leafCount;
    const zDown = BASE_Z + (n - 1 - index) * GAP;
    const zUp = BASE_Z + index * GAP;
    leaf.mesh.position.z = THREE.MathUtils.lerp(zDown, zUp, p) + turning * 0.03;
    if (leaf.rigid) leaf.mesh.position.y = 0;
  }

  private isMovingNow(): boolean {
    return this.wasMoving || this.dragging !== undefined;
  }

  /** Loads real surfaces for leaves near `spread` and frees the rest. */
  private refreshWindow(spread = this.settled): void {
    this.leaves.forEach((leaf, i) => {
      const near = i >= spread - WINDOW_BEHIND && i <= spread + WINDOW_AHEAD - 1;
      const keep = near || leaf.rigid;
      if (keep && !leaf.loaded) {
        leaf.loaded = true;
        const token = ++leaf.loading;
        void Promise.all([this.surface(i, 'front'), this.surface(i, 'back')]).then(([front, back]) => {
          if (token !== leaf.loading || !leaf.loaded) {
            dispose(front);
            dispose(back);
            return;
          }
          const mats = leaf.mesh.material as THREE.Material[];
          mats[4] = front;
          mats[5] = back;
        });
      } else if (!keep && leaf.loaded) {
        leaf.loaded = false;
        leaf.loading++;
        const mats = leaf.mesh.material as THREE.Material[];
        for (const k of [4, 5]) {
          if (mats[k] !== this.placeholder) dispose(mats[k]!);
          mats[k] = this.placeholder;
        }
      }
    });
  }
}

/** Frees a page material and the textures it owns (`userData.owned`); shared textures are left alone. */
function dispose(material: THREE.Material): void {
  for (const t of (material.userData.owned ?? []) as THREE.Texture[]) t.dispose();
  material.dispose();
}

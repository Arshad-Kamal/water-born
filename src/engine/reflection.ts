import * as THREE from 'three';
import { COVER_DEPTH, COVER_H, COVER_W, type Book } from './book3d.ts';
import { canvas } from './pages.ts';
import { tween } from './ticker.ts';

/** Gap between the hovering book and the water it is mirrored in. */
const HOVER = 0.06;
const OPACITY = 0.24;
const FADE_SECONDS = 0.8;

function fadeMap(): THREE.CanvasTexture {
  const [c, ctx] = canvas(4, 64);
  // Canvas top lands at v=1 (the cover's top, far from the water), so fade from there.
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, '#000');
  g.addColorStop(0.55, '#000');
  g.addColorStop(1, '#fff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  return new THREE.CanvasTexture(c);
}

/** The closed book's cover mirrored in the dark lake below it, for the start screen only. */
export class CoverReflection {
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene, book: Book, coverMap: THREE.Texture) {
    this.scene = scene;
    const geometry = new THREE.PlaneGeometry(COVER_W, COVER_H).translate(COVER_W / 2, 0, COVER_DEPTH / 2);
    const material = new THREE.MeshBasicMaterial({ map: coverMap, alphaMap: fadeMap(), transparent: true, opacity: OPACITY, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.matrixAutoUpdate = false;
    book.group.updateMatrixWorld(true);
    const cover = book.coverMesh.matrixWorld;
    const lowest = Math.min(...[-1, 1].map((z) => new THREE.Vector3(0, -COVER_H / 2, (z * COVER_DEPTH) / 2).applyMatrix4(cover).y));
    const mirror = new THREE.Matrix4().makeScale(1, -1, 1).setPosition(0, 2 * (lowest - HOVER), 0);
    this.mesh.matrix.multiplyMatrices(mirror, cover);
    scene.add(this.mesh);
  }

  /** Fades away as the book opens, then frees itself (the cover texture is shared and stays). */
  fadeOut(): void {
    const { material, geometry } = this.mesh;
    void tween(FADE_SECONDS, (k) => (material.opacity = OPACITY * (1 - k))).then(() => {
      this.scene.remove(this.mesh);
      geometry.dispose();
      material.alphaMap?.dispose();
      material.dispose();
    });
  }
}

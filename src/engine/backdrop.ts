import * as THREE from 'three';
import { damp } from './ticker.ts';

const DISTANCE = 20;
const OVERSCAN = 1.25;
const FADE_RATE = 1.8;

function canvas2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  return [c, ctx];
}

/**
 * Heavily blurred copy of an image, cropped landscape: the "world" behind the book.
 * Shrinks to a few pixels, then doubles back up in steps so it stays smooth, not blocky
 * (ctx.filter blur would be simpler but older iPad Safari lacks it).
 */
function blurred(image: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const [small, sctx] = canvas2d(32, 20);
  const scale = Math.max(small.width / w, small.height / h);
  sctx.drawImage(image, (small.width - w * scale) / 2, (small.height - h * scale) * 0.4, w * scale, h * scale);
  let c = small;
  for (let i = 0; i < 4; i++) {
    const [next, nctx] = canvas2d(c.width * 2, c.height * 2);
    nctx.drawImage(c, 0, 0, next.width, next.height);
    c = next;
  }
  return c;
}

interface Layer {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  target: number;
}

export class Backdrop {
  private readonly layers: Layer[];
  private front = 0;
  private time = 0;
  private readonly camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.layers = [0, 1].map((i) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false }),
      );
      mesh.position.z = -DISTANCE - i * 0.01;
      mesh.renderOrder = -10;
      camera.add(mesh);
      return { mesh, target: 0 };
    });
  }

  /** Cross-fades to a blurred `image`; with no image the stage's own grade colour shows through. */
  show(image: CanvasImageSource | undefined, w: number, h: number, brightness: number): void {
    if (!image) {
      for (const layer of this.layers) layer.target = 0;
      return;
    }
    const next = this.layers[1 - this.front]!;
    const prev = this.layers[this.front]!;
    this.front = 1 - this.front;
    const mat = next.mesh.material;
    mat.map?.dispose();
    mat.map = new THREE.CanvasTexture(blurred(image, w, h));
    mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.color.setScalar(brightness);
    mat.needsUpdate = true;
    next.mesh.renderOrder = -9;
    prev.mesh.renderOrder = -10;
    next.target = 1;
    prev.target = 0;
  }

  update(dt: number): void {
    this.time += dt;
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * DISTANCE * OVERSCAN;
    const k = damp(FADE_RATE, dt);
    for (const [i, { mesh, target }] of this.layers.entries()) {
      mesh.material.opacity += (target - mesh.material.opacity) * k;
      mesh.visible = mesh.material.opacity > 0.002;
      const drift = 1 + 0.04 * Math.sin(this.time * 0.05 + i);
      mesh.scale.set(h * this.camera.aspect * drift, h * drift, 1);
      mesh.position.x = Math.sin(this.time * 0.031 + i) * 0.4;
      mesh.position.y = Math.cos(this.time * 0.027 + i) * 0.25;
    }
  }
}

import * as THREE from 'three';
import { tween } from './ticker.ts';

const DISTANCE = 20;
const OVERSCAN = 1.25;

/** Heavily blurred copy of an image, cropped landscape: the "world" behind the book. */
function blurred(image: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const small = document.createElement('canvas');
  small.width = 48;
  small.height = 30;
  const sctx = small.getContext('2d')!;
  const scale = Math.max(small.width / w, small.height / h);
  sctx.drawImage(image, (small.width - w * scale) / 2, (small.height - h * scale) * 0.4, w * scale, h * scale);
  const big = document.createElement('canvas');
  big.width = 384;
  big.height = 240;
  const bctx = big.getContext('2d')!;
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(small, 0, 0, big.width, big.height);
  return big;
}

export class Backdrop {
  private readonly layers: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[];
  private front = 0;
  private time = 0;
  private readonly camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.layers = [0, 1].map((i) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false, color: new THREE.Color(0.5, 0.5, 0.5) }),
      );
      mesh.position.z = -DISTANCE - i * 0.01;
      mesh.renderOrder = -10;
      camera.add(mesh);
      return mesh;
    });
  }

  show(image: CanvasImageSource | undefined, w: number, h: number, brightness = 0.5): void {
    const next = this.layers[1 - this.front]!;
    const prev = this.layers[this.front]!;
    this.front = 1 - this.front;
    next.material.map?.dispose();
    next.material.map = image ? new THREE.CanvasTexture(blurred(image, w, h)) : null;
    if (next.material.map) next.material.map.colorSpace = THREE.SRGBColorSpace;
    next.material.color.setScalar(image ? brightness : 0);
    next.material.needsUpdate = true;
    next.renderOrder = -9;
    prev.renderOrder = -10;
    const from = next.material.opacity;
    void tween(1.6, (k) => {
      next.material.opacity = from + (1 - from) * k;
      prev.material.opacity = 1 - k;
    });
  }

  update(dt: number): void {
    this.time += dt;
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * DISTANCE * OVERSCAN;
    for (const [i, layer] of this.layers.entries()) {
      const drift = 1 + 0.04 * Math.sin(this.time * 0.05 + i);
      layer.scale.set(h * this.camera.aspect * drift, h * drift, 1);
      layer.position.x = Math.sin(this.time * 0.031 + i) * 0.4;
      layer.position.y = Math.cos(this.time * 0.027 + i) * 0.25;
    }
  }
}

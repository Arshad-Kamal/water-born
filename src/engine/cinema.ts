import * as THREE from 'three';
import { easeInOutSine, tween } from './ticker.ts';

const DISTANCE = 1;

/** Full-frame shot that fades in over the scene during a camera push-in, with a slow Ken Burns move. */
export class Cinema {
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private aspect = 1.5;
  private zoom = 1;
  private pan = 0;
  private readonly camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, toneMapped: false }),
    );
    this.mesh.position.z = -DISTANCE;
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;
    camera.add(this.mesh);
  }

  /** Shows `image` for `seconds`, resolving once it has faded back out. */
  async play(image: HTMLCanvasElement | HTMLImageElement, width: number, height: number, seconds: number, alive: () => boolean): Promise<void> {
    this.mesh.material.map?.dispose();
    const tex = new THREE.Texture(image);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.mesh.material.map = tex;
    this.mesh.material.needsUpdate = true;
    this.aspect = width / height;
    this.mesh.visible = true;
    const hold = Math.max(0.5, seconds - 1.6);
    void tween(seconds, (k) => {
      this.zoom = 1 + 0.09 * k;
      this.pan = (k - 0.5) * 0.04;
    }, easeInOutSine);
    await tween(0.8, (k) => (this.mesh.material.opacity = k));
    const end = performance.now() + hold * 1000;
    while (performance.now() < end && alive()) await tween(0.1, () => undefined);
    await tween(0.8, (k) => (this.mesh.material.opacity = 1 - k));
    this.mesh.visible = false;
    // Free the full-screen picture now rather than holding it until the next push-in.
    tex.dispose();
    if (this.mesh.material.map === tex) this.mesh.material.map = null;
  }

  update(): void {
    if (!this.mesh.visible) return;
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * DISTANCE;
    const viewW = viewH * this.camera.aspect;
    const fit = Math.max(viewW / this.aspect, viewH);
    this.mesh.scale.set(fit * this.aspect * this.zoom, fit * this.zoom, 1);
    this.mesh.position.x = this.pan * viewW;
  }
}

import * as THREE from 'three';
import { easeInOutSine, tween } from './ticker.ts';

const DISTANCE = 1;
/** Height of each cinematic letterbox bar as a fraction of the screen (`.letterbox` is 11vh in styles.css). */
const LETTERBOX = 0.11;
const BAND = 1 - 2 * LETTERBOX;

/**
 * Full-frame shot that fades in over the scene during a camera push-in. The picture fills the
 * band between the letterbox bars and slowly zooms while panning across whatever the screen crops: left to right on a
 * narrow screen (a wide painting on a phone), top to bottom where the height is cropped.
 */
export class Cinema {
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private aspect = 1.5;
  private zoom = 1;
  /** -1 shows the picture's left/top edge, 1 its right/bottom edge. */
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

  /** Shows `image` for `seconds` (longer when the screen crops it), resolving once it has faded back out. */
  async play(image: HTMLCanvasElement | HTMLImageElement, width: number, height: number, seconds: number, alive: () => boolean): Promise<void> {
    const tex = new THREE.Texture(image);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.mesh.material.map = tex;
    this.mesh.material.needsUpdate = true;
    this.aspect = width / height;
    this.mesh.visible = true;
    // Fraction of the picture the screen shows along its cropped side; the more is hidden, the longer the pan.
    const band = this.camera.aspect / BAND;
    const shown = Math.min(band / this.aspect, this.aspect / band);
    const total = seconds * (2 - shown);
    const start = performance.now();
    const move = (): void => {
      const k = easeInOutSine(Math.min(1, (performance.now() - start) / (total * 1000)));
      this.zoom = 1 + 0.09 * k;
      this.pan = 2 * k - 1;
    };
    await tween(0.8, (k) => {
      this.mesh.material.opacity = k;
      move();
    });
    const end = start + (total - 0.8) * 1000;
    while (performance.now() < end && alive()) await tween(0.1, move);
    await tween(0.8, (k) => {
      this.mesh.material.opacity = 1 - k;
      move();
    });
    this.mesh.visible = false;
    // Free the full-screen picture now rather than holding it until the next push-in.
    tex.dispose();
    if (this.mesh.material.map === tex) this.mesh.material.map = null;
  }

  update(): void {
    if (!this.mesh.visible) return;
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * DISTANCE;
    const viewW = viewH * this.camera.aspect;
    const bandH = viewH * BAND;
    const fit = Math.max(viewW / this.aspect, bandH);
    const w = fit * this.aspect * this.zoom;
    const h = fit * this.zoom;
    this.mesh.scale.set(w, h, 1);
    this.mesh.position.x = (-this.pan * (w - viewW)) / 2;
    // The stage's view offset (room for the HUD) lifts the camera axis off screen centre; undo it.
    const view = this.camera.view;
    const lift = view?.enabled ? (view.offsetY / view.fullHeight) * viewH : 0;
    this.mesh.position.y = (this.pan * (h - bandH)) / 2 - lift;
  }
}

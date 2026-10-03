import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Grade } from '../content/scenes.ts';
import { damp, runTicks } from './ticker.ts';

interface GradeSpec {
  readonly bg: string;
  readonly sky: string;
  readonly ground: string;
  readonly hemi: number;
  readonly key: string;
  readonly keyI: number;
  readonly fire: string;
  readonly fireI: number;
  readonly bloom: number;
}

const GRADES: Readonly<Record<Grade, GradeSpec>> = {
  'calm-night': { bg: '#06101a', sky: '#6f9bc4', ground: '#1a1208', hemi: 0.75, key: '#d6e4ff', keyI: 2.0, fire: '#ff7a2a', fireI: 0.5, bloom: 0.45 },
  'fire-night': { bg: '#140604', sky: '#ffc79a', ground: '#240a04', hemi: 0.6, key: '#ffdcb4', keyI: 2.2, fire: '#ff5a1a', fireI: 2.4, bloom: 0.6 },
  underwater: { bg: '#021a24', sky: '#5fd0dc', ground: '#021014', hemi: 0.85, key: '#9fe9f2', keyI: 1.7, fire: '#3fb8c9', fireI: 0.9, bloom: 0.55 },
  'river-night': { bg: '#050d18', sky: '#7fa6d6', ground: '#0a0f10', hemi: 0.7, key: '#c4d8ff', keyI: 2.0, fire: '#ffcf6a', fireI: 0.5, bloom: 0.5 },
  day: { bg: '#0f1d16', sky: '#fff1d0', ground: '#2f4a2a', hemi: 0.85, key: '#fff0d0', keyI: 2.2, fire: '#ffd27a', fireI: 0, bloom: 0.3 },
  dusk: { bg: '#170c12', sky: '#ffb07a', ground: '#2a1420', hemi: 0.8, key: '#ffb47a', keyI: 2.4, fire: '#ff9a4a', fireI: 0.7, bloom: 0.45 },
  moon: { bg: '#040814', sky: '#a9c6e8', ground: '#05070c', hemi: 0.65, key: '#c9dcff', keyI: 2.0, fire: '#ffcf6a', fireI: 0.3, bloom: 0.5 },
  dawn: { bg: '#170d14', sky: '#ffc0b0', ground: '#1e1820', hemi: 0.8, key: '#ffd0b0', keyI: 2.4, fire: '#ff7a2a', fireI: 0.8, bloom: 0.4 },
  battle: { bg: '#160a06', sky: '#ffd8a8', ground: '#1a0c06', hemi: 0.85, key: '#fff0d0', keyI: 2.8, fire: '#ff6a1f', fireI: 2.2, bloom: 0.6 },
  sunrise: { bg: '#1a120a', sky: '#ffe2a8', ground: '#2a2a18', hemi: 0.85, key: '#ffe0a0', keyI: 2.4, fire: '#ffb45a', fireI: 0.4, bloom: 0.45 },
};

interface GradeColors {
  readonly bg: THREE.Color;
  readonly sky: THREE.Color;
  readonly ground: THREE.Color;
  readonly key: THREE.Color;
  readonly fire: THREE.Color;
}

const GRADE_COLORS = Object.fromEntries(
  Object.entries(GRADES).map(([name, g]) => [
    name,
    { bg: new THREE.Color(g.bg), sky: new THREE.Color(g.sky), ground: new THREE.Color(g.ground), key: new THREE.Color(g.key), fire: new THREE.Color(g.fire) },
  ]),
) as Record<Grade, GradeColors>;

/** The grade's sky colour, for painting placeholder pictures in the scene's light. */
export const gradeSky = (grade: Grade): string => GRADES[grade].sky;

/** Above lit paper white, so only fire, magic and sparkles bloom, never the page under the words. */
const BLOOM_THRESHOLD = 0.95;

const FOV = 30;
/** Camera elevation: looks slightly down onto the tilted book. */
const VIEW_DIR = new THREE.Vector3(0, 0.26, 1).normalize();
const HUD_RESERVE_PX = 70;

export interface Framing {
  /** World-space point the camera looks at. */
  readonly look: THREE.Vector3;
  /** Half extents (world units) that must fit on screen. */
  readonly halfW: number;
  readonly halfH: number;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
  readonly lite: boolean;
  private readonly composer?: EffectComposer;
  private readonly bloom?: UnrealBloomPass;
  private readonly hemi = new THREE.HemisphereLight();
  private readonly key = new THREE.DirectionalLight();
  private readonly fire = new THREE.PointLight('#ff6a1f', 0, 7, 1.2);
  private grade: GradeSpec = GRADES['calm-night'];
  private colors: GradeColors = GRADE_COLORS['calm-night'];
  private readonly bg = new THREE.Color(GRADES['calm-night'].bg);
  private readonly breathe = new THREE.Vector3();
  private flashLevel = 0;
  private shakeLevel = 0;
  private framing: Framing = { look: new THREE.Vector3(), halfW: 1, halfH: 1 };
  private readonly camLook = new THREE.Vector3();
  private camDist = 6;
  private readonly timer = new THREE.Timer();
  private readonly time = { value: 0 };

  constructor(host: HTMLElement) {
    this.lite = Math.min(screen.width, screen.height) < 500 || (navigator.hardwareConcurrency || 8) <= 4;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.lite ? 1.5 : 2));
    // Neutral keeps the paintings' own colours; ACES visibly dulled and darkened them.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = !this.lite;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.className = 'stage';
    host.prepend(this.renderer.domElement);

    this.scene.background = this.bg;
    this.scene.add(this.hemi, this.key, this.key.target, this.fire, this.camera);
    this.key.position.set(-2.2, 3.2, 5);
    this.key.castShadow = !this.lite;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.0005;
    this.key.shadow.normalBias = 0.02;
    Object.assign(this.key.shadow.camera, { left: -2.4, right: 2.4, top: 2, bottom: -2, near: 1, far: 12 });
    this.fire.position.set(-0.6, -2.4, 1.2);

    if (!this.lite) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.55, BLOOM_THRESHOLD);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.applyGrade(1);
    this.timer.connect(document);
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  /** Seconds since start; shared with shaders. */
  get clockUniform(): { value: number } {
    return this.time;
  }

  /** Converts a world-space size at distance 1 into gl_PointSize pixels. */
  get pointScale(): number {
    return this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  }

  setGrade(grade: Grade): void {
    this.grade = GRADES[grade];
    this.colors = GRADE_COLORS[grade];
  }

  frame(framing: Framing, instant = false): void {
    this.framing = framing;
    if (instant) {
      this.camLook.copy(framing.look);
      this.camDist = this.fitDistance(framing);
    }
  }

  shake(strength: number): void {
    this.shakeLevel = Math.max(this.shakeLevel, strength);
  }

  flash(): void {
    this.flashLevel = 1;
  }

  start(): void {
    this.renderer.setAnimationLoop((timestamp) => this.loop(timestamp));
  }

  private fitDistance(f: Framing): number {
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const usableH = Math.max(0.5, (innerHeight - HUD_RESERVE_PX) / innerHeight);
    return Math.max(f.halfW / (tanV * this.camera.aspect), f.halfH / (tanV * usableH));
  }

  private resize(): void {
    this.camera.aspect = innerWidth / innerHeight;
    // Centre the view in the space above the HUD bar.
    this.camera.setViewOffset(innerWidth, innerHeight, 0, HUD_RESERVE_PX / 2, innerWidth, innerHeight);
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer?.setSize(innerWidth, innerHeight);
    this.bloom?.resolution.set(innerWidth / 2, innerHeight / 2);
  }

  private applyGrade(k: number): void {
    const c = this.colors;
    this.bg.lerp(c.bg, k);
    this.hemi.color.lerp(c.sky, k);
    this.hemi.groundColor.lerp(c.ground, k);
    this.hemi.intensity += (this.grade.hemi - this.hemi.intensity) * k;
    this.key.color.lerp(c.key, k);
    this.fire.color.lerp(c.fire, k);
  }

  private loop(timestamp: number): void {
    const dt = Math.min(this.timer.update(timestamp).getDelta(), 0.05);
    this.time.value += dt;
    const t = this.time.value;
    runTicks(dt, t);

    this.applyGrade(damp(1.4, dt));
    const g = this.grade;
    this.flashLevel = Math.max(0, this.flashLevel - dt * 2.5);
    this.key.intensity += (g.keyI * (1 + this.flashLevel * 1.4) - this.key.intensity) * damp(8, dt);
    const flicker = 1 + 0.22 * Math.sin(t * 13.1) + 0.14 * Math.sin(t * 31.7 + 1.3) + 0.08 * Math.sin(t * 57.3);
    this.fire.intensity += (g.fireI * flicker + this.flashLevel * 3 - this.fire.intensity) * damp(10, dt);
    if (this.bloom) this.bloom.strength += (g.bloom + this.flashLevel * 0.5 - this.bloom.strength) * damp(4, dt);

    this.camLook.lerp(this.framing.look, damp(2.2, dt));
    this.camDist += (this.fitDistance(this.framing) - this.camDist) * damp(2.2, dt);
    this.shakeLevel = Math.max(0, this.shakeLevel - dt * 1.6);
    const s = this.shakeLevel * this.shakeLevel * 0.06;
    const breathe = this.breathe.set(Math.sin(t * 0.21) * 0.025, Math.sin(t * 0.17 + 1) * 0.018, 0);
    this.camera.position.copy(this.camLook).addScaledVector(VIEW_DIR, this.camDist).add(breathe);
    this.camera.position.x += (Math.random() - 0.5) * s;
    this.camera.position.y += (Math.random() - 0.5) * s;
    this.camera.lookAt(this.camLook.x + breathe.x * 0.5, this.camLook.y + breathe.y * 0.5, this.camLook.z);

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}

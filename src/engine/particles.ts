// Atmosphere particles. Motion runs entirely in the vertex shader from a per-particle
// seed and time, so the CPU only fades intensities.
import * as THREE from 'three';
import type { ParticleKind } from '../content/scenes.ts';
import { damp } from './ticker.ts';

interface KindSpec {
  readonly id: number;
  readonly count: number;
  readonly size: [number, number];
  readonly colors: [string, string];
  readonly additive: boolean;
  /** 0 soft dot, 1 glow, 2 bubble ring, 3 star, 4 big soft cloud */
  readonly shape: number;
}

const KINDS: Readonly<Record<ParticleKind, KindSpec>> = {
  embers: { id: 0, count: 300, size: [0.012, 0.032], colors: ['#ff5a14', '#ffd27a'], additive: true, shape: 1 },
  ash: { id: 1, count: 120, size: [0.01, 0.022], colors: ['#6e6460', '#a39a92'], additive: false, shape: 0 },
  dust: { id: 2, count: 180, size: [0.006, 0.016], colors: ['#7a5a3a', '#c2a27a'], additive: false, shape: 0 },
  bubbles: { id: 3, count: 150, size: [0.018, 0.055], colors: ['#9fe9f2', '#ffffff'], additive: false, shape: 2 },
  fireflies: { id: 4, count: 70, size: [0.02, 0.04], colors: ['#c8ff6a', '#fff3a0'], additive: true, shape: 1 },
  motes: { id: 5, count: 160, size: [0.008, 0.02], colors: ['#fff1c8', '#ffd890'], additive: true, shape: 1 },
  mist: { id: 6, count: 26, size: [0.9, 1.8], colors: ['#cfe6f0', '#e8f4f6'], additive: false, shape: 4 },
  spray: { id: 7, count: 150, size: [0.006, 0.014], colors: ['#8fe3ef', '#ffffff'], additive: true, shape: 1 },
  sparkles: { id: 8, count: 90, size: [0.02, 0.045], colors: ['#7fdbe7', '#ffe7a8'], additive: true, shape: 3 },
};

const REGION = new THREE.Vector3(5.2, 3.6, 2.2);

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uScale;
  uniform float uBurst;
  uniform vec3 uOrigin;
  attribute vec4 aSeed;
  attribute float aSize;
  varying float vAlpha;
  varying float vMix;
  const vec3 R = vec3(${REGION.x}, ${REGION.y}, ${REGION.z});

  float wrap(float v, float size) { return mod(v + size * 0.5, size) - size * 0.5; }

  void main() {
    vec3 p = position;
    float t = uTime;
    float s = aSeed.x * 6.2831;
    vAlpha = step(aSeed.w, uIntensity);
    vMix = aSeed.y;
    #if KIND == 0
      p.y = wrap(p.y + t * (0.16 + aSeed.y * 0.32), R.y);
      p.x += sin(t * 0.7 + s) * 0.18;
      vAlpha *= (0.55 + 0.45 * sin(t * 9.0 + s * 3.0)) * smoothstep(R.y * 0.5, R.y * 0.15, p.y);
    #elif KIND == 1
      p.y = wrap(p.y - t * (0.05 + aSeed.y * 0.08), R.y);
      p.x += sin(t * 0.4 + s) * 0.3;
      vAlpha *= 0.55;
    #elif KIND == 2
      p.y = wrap(p.y - t * (0.12 + aSeed.y * 0.2), R.y);
      p.x += sin(t * 0.6 + s) * 0.05;
      vAlpha *= 0.7;
    #elif KIND == 3
      p.y = wrap(p.y + t * (0.12 + aSeed.y * 0.22), R.y);
      p.x += sin(t * 2.2 + s) * 0.04;
      vAlpha *= 0.75;
    #elif KIND == 4
      float f = 0.6 + aSeed.y;
      p += vec3(sin(t * 0.31 * f + s) * 0.45, sin(t * 0.23 * f + s * 2.0) * 0.3, sin(t * 0.17 + s) * 0.25);
      vAlpha *= pow(max(0.0, sin(t * 1.2 * f + s * 4.0)), 3.0);
    #elif KIND == 5
      p.y = wrap(p.y + t * 0.03 * (0.4 + aSeed.y), R.y);
      p.x = wrap(p.x + t * 0.05 * (0.4 + aSeed.z), R.x);
      vAlpha *= 0.35 + 0.35 * sin(t * 1.5 + s);
    #elif KIND == 6
      p.x = wrap(p.x + t * 0.06 * (0.4 + aSeed.y), R.x + 2.0);
      p.y *= 0.7;
      vAlpha *= 0.14;
    #elif KIND == 7
      if (uBurst >= 0.0) {
        float age = t - uBurst;
        vec3 dir = normalize(aSeed.xyz * 2.0 - 1.0 + vec3(0.0, 0.6, 0.6));
        p = uOrigin + dir * age * (1.2 + aSeed.w * 1.6) + vec3(0.0, -1.6, 0.0) * age * age;
        vAlpha = clamp(1.0 - age / 1.2, 0.0, 1.0);
      } else {
        p.y = wrap(p.y - t * (0.5 + aSeed.y * 0.6), R.y);
        p.x = wrap(p.x + t * 0.25, R.x);
        vAlpha *= 0.6;
      }
    #elif KIND == 8
      p += vec3(sin(t * 0.2 + s) * 0.1, t * 0.02, 0.0);
      p.y = wrap(p.y, R.y);
      vAlpha *= pow(max(0.0, sin(t * 2.4 + s * 5.0)), 4.0);
    #endif
    #if KIND == 2 || KIND == 8
      if (uBurst >= 0.0) {
        float age = t - uBurst;
        vec3 dir = normalize(aSeed.xyz * 2.0 - 1.0);
        p = uOrigin + dir * age * (0.5 + aSeed.w * 1.2) + vec3(0.0, -0.5, 0.0) * age * age;
        vAlpha = clamp(1.0 - age / 1.6, 0.0, 1.0);
      }
    #endif
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vMix;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float a;
    #if SHAPE == 0
      a = smoothstep(0.5, 0.15, r);
    #elif SHAPE == 1
      a = exp(-r * r * 22.0);
    #elif SHAPE == 2
      a = smoothstep(0.5, 0.42, r) * smoothstep(0.26, 0.44, r) + smoothstep(0.16, 0.0, length(c + vec2(0.14, 0.14))) * 0.9;
    #elif SHAPE == 3
      a = exp(-r * r * 40.0) + (exp(-abs(c.x) * 40.0) + exp(-abs(c.y) * 40.0)) * smoothstep(0.5, 0.0, r) * 0.5;
    #else
      a = exp(-r * r * 9.0);
    #endif
    float alpha = a * vAlpha * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(mix(uColorA, uColorB, vMix), alpha);
  }
`;

interface Layer {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  target: number;
  level: number;
}

function makePoints(spec: KindSpec, count: number, seed: number): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  let s = seed;
  const rand = (): number => (s = (s * 16807) % 2147483647) / 2147483647;
  const pos = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(rand() - 0.5) * REGION.x, (rand() - 0.5) * REGION.y, rand() * REGION.z - 0.4], i * 3);
    seeds.set([rand(), rand(), rand(), rand()], i * 4);
    sizes[i] = spec.size[0] + rand() * (spec.size[1] - spec.size[0]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    defines: { KIND: spec.id, SHAPE: spec.shape },
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uOpacity: { value: 0 },
      uScale: { value: 1 },
      uBurst: { value: -1 },
      uOrigin: { value: new THREE.Vector3() },
      uColorA: { value: new THREE.Color(spec.colors[0]) },
      uColorB: { value: new THREE.Color(spec.colors[1]) },
    },
    transparent: true,
    depthWrite: false,
    blending: spec.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 10;
  return points;
}

const BURST_KINDS = ['spray', 'sparkles', 'dust'] as const satisfies readonly ParticleKind[];
type BurstKind = (typeof BURST_KINDS)[number];

export class Particles {
  private readonly layers = new Map<ParticleKind, Layer>();
  private readonly bursts = new Map<BurstKind, THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>();

  constructor(scene: THREE.Scene, lite: boolean) {
    let seed = 101;
    for (const [kind, spec] of Object.entries(KINDS) as [ParticleKind, KindSpec][]) {
      const points = makePoints(spec, Math.round(spec.count * (lite ? 0.5 : 1)), seed++ * 7919);
      points.visible = false;
      scene.add(points);
      this.layers.set(kind, { points, target: 0, level: 0 });
    }
    for (const kind of BURST_KINDS) {
      const spec = KINDS[kind];
      const points = makePoints(spec, lite ? 60 : 120, seed++ * 7919);
      points.material.uniforms.uIntensity!.value = 1;
      points.material.uniforms.uOpacity!.value = 1;
      points.visible = false;
      scene.add(points);
      this.bursts.set(kind, points);
    }
  }

  set(levels: Readonly<Partial<Record<ParticleKind, number>>>): void {
    for (const [kind, layer] of this.layers) layer.target = levels[kind] ?? 0;
  }

  burst(kind: ParticleKind, origin: THREE.Vector3, time: number): void {
    const points = this.bursts.get(kind as BurstKind);
    if (!points) return;
    points.material.uniforms.uBurst!.value = time;
    points.material.uniforms.uOrigin!.value.copy(origin);
    points.visible = true;
  }

  update(dt: number, time: number, pixelScale: number): void {
    for (const layer of this.layers.values()) {
      layer.level += (layer.target - layer.level) * damp(0.9, dt);
      const u = layer.points.material.uniforms;
      u.uTime!.value = time;
      u.uIntensity!.value = Math.min(1, layer.level * 1.15);
      u.uOpacity!.value = Math.min(1, layer.level * 2);
      u.uScale!.value = pixelScale;
      layer.points.visible = layer.level > 0.01;
    }
    for (const points of this.bursts.values()) {
      const u = points.material.uniforms;
      u.uTime!.value = time;
      u.uScale!.value = pixelScale;
      if (points.visible && time - u.uBurst!.value > 1.8) points.visible = false;
    }
  }
}

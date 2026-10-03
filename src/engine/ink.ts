import * as THREE from 'three';
import { ALWAYS } from './pages.ts';

/** Characters over which a letter fades in. */
const SOFT = 5;
/** Characters behind the reveal front over which wet aqua ink dries to its own colour. */
const DRY = 36;

export interface InkUniforms {
  readonly reveal: { value: number };
}

/** Parchment material whose words ink themselves in as `reveal` (a character index) advances. */
export function inkMaterial(paper: THREE.Texture, ink: THREE.Texture, mask: THREE.Texture): [THREE.MeshStandardMaterial, InkUniforms] {
  const reveal = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uInk: { value: ink }, uMask: { value: mask }, uReveal: reveal });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uInk;\nuniform sampler2D uMask;\nuniform float uReveal;\nfloat inkGlow = 0.0;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec4 inkTex = texture2D(uInk, vMapUv);
        vec4 m = texture2D(uMask, vMapUv);
        float idx = floor(m.r * 255.0 + 0.5) * 256.0 + floor(m.g * 255.0 + 0.5) - 1.0;
        bool always = idx > ${ALWAYS - 1}.5;
        float shown = always ? 1.0 : (idx < 0.0 ? 0.0 : clamp((uReveal - idx) / ${SOFT}.0, 0.0, 1.0));
        float wet = always ? 0.0 : 1.0 - clamp((uReveal - idx - ${SOFT}.0) / ${DRY}.0, 0.0, 1.0);
        vec3 inkColor = mix(inkTex.rgb, vec3(0.12, 0.47, 0.57), wet * 0.85);
        diffuseColor.rgb = mix(diffuseColor.rgb, inkColor, inkTex.a * shown);
        inkGlow = inkTex.a * shown * wet;`,
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.1, 0.55, 0.65) * inkGlow * 0.35;');
  };
  return [mat, { reveal }];
}

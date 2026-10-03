// One home for every generated sound. scripts/gen-audio.ts reads the prompts;
// the reader only uses the ids. Files land in public/audio/{sfx,music}/<id>.mp3.

export interface SfxSpec {
  readonly prompt: string;
  readonly seconds: number;
  readonly loop?: boolean;
}

export interface MusicSpec {
  readonly prompt: string;
  readonly seconds: number;
}

export const SFX = {
  'page-turn': { prompt: 'Single thick paper page of a large storybook being turned, crisp paper flip and soft swish, close up', seconds: 1.2 },
  'book-open': { prompt: 'Heavy leather-bound book cover creaking open, then pages rustling and settling', seconds: 2.2 },
  'roof-collapse': { prompt: 'Huge cinematic explosion boom, then wooden roof beams cracking and crashing down, debris falling', seconds: 4 },
  rumble: { prompt: 'Low deep ground rumble, earth shaking, small debris and dust trickling', seconds: 4 },
  'fire-loop': { prompt: 'Large village fire burning, roaring crackling flames, wood popping and embers, steady', seconds: 20, loop: true },
  'water-whoosh': { prompt: 'Magical swirling water whoosh, a water spell spinning into a vortex with splashes', seconds: 2 },
  'steam-hiss': { prompt: 'Burst of water dousing a fire, loud sizzling steam hiss fading out', seconds: 2.5 },
  punch: { prompt: 'Fast cartoon action whoosh into a punchy impact hit with a splash of water, armour clank', seconds: 1.5 },
  'dragon-roar': { prompt: 'Huge fire dragon roar, deep fearsome bellow with a rumble of fiery breath, cinematic', seconds: 4 },
  'wing-gust': { prompt: 'Giant leathery dragon wings flapping powerfully overhead, heavy gusts of wind passing by', seconds: 3 },
  'dive-splash': { prompt: 'Person diving into a lake, a deep splash then sinking underwater, muffled bubbles rising', seconds: 3 },
  'underwater-loop': { prompt: 'Underwater ambience, deep muffled water, slow gentle bubbles, calm and dark', seconds: 20, loop: true },
  'night-jungle-loop': { prompt: 'Amazon rainforest at night, crickets and tree frogs, gentle river flowing, distant night birds', seconds: 30, loop: true },
  'river-day-loop': { prompt: 'Amazon riverbank by day, wide river flowing, tropical birds calling, insects buzzing softly', seconds: 30, loop: true },
  'record-scratch': { prompt: 'Vinyl record scratch, a sudden comedic stop', seconds: 1 },
  'card-flip': { prompt: 'Quick playing card flip, light paper swish and snap', seconds: 0.6 },
  'splash-big': { prompt: 'Huge water splash, a wave crashing and spraying', seconds: 2.5 },
  'rapids-loop': { prompt: 'Fast river rapids rushing past, splashing water, swimming through a flowing river', seconds: 20, loop: true },
  'waterfall-loop': { prompt: 'Massive waterfall roaring, thundering falling water and mist, powerful and steady', seconds: 20, loop: true },
  'vine-whoosh': { prompt: 'Swinging on a jungle vine, whoosh through the air with a rope creak and leaves rustling', seconds: 2 },
  'count-chime': { prompt: 'Single soft magical water droplet chime, bright and clear', seconds: 0.6 },
  'dawn-loop': { prompt: 'Early morning jungle, songbirds waking, soft mist, calm water lapping gently', seconds: 30, loop: true },
  'camp-loop': { prompt: 'Enemy war camp at dawn, crackling iron fire braziers, distant armour clinking, flags flapping in wind', seconds: 20, loop: true },
  'battle-clash': { prompt: 'Magical battle clash, a water wave slamming into fireballs, huge steam explosion with sparkles', seconds: 4 },
  'victory-sparkle': { prompt: 'Magical shimmering sparkle chime rising, bright and triumphant', seconds: 2.5 },
} as const satisfies Record<string, SfxSpec>;

const SCORE = 'Instrumental cinematic orchestral film score for a fantasy adventure storybook for children, no vocals.';

export const MUSIC = {
  theme: { prompt: `${SCORE} Main title theme: warm and mysterious opening with harp, celesta and flute over soft strings, shimmering water-like textures, a hopeful heroic melody that gently builds, then settles. Loops smoothly.`, seconds: 70 },
  attack: { prompt: `${SCORE} A surprise night attack on a village: urgent pounding war drums, low brass stabs, fast tense strings, fire and danger, relentless and exciting but not horror. Loops smoothly.`, seconds: 90 },
  sorrow: { prompt: `${SCORE} Escape and loss at night: slow solo cello and soft piano over hushed strings, sad but quietly determined, ending with a hint of resolve. Loops smoothly.`, seconds: 70 },
  hope: { prompt: `${SCORE} Training and friendship: upbeat playful adventure, plucked strings, light percussion, whistle-like flute melody, growing confidence and fun. Loops smoothly.`, seconds: 80 },
  journey: { prompt: `${SCORE} A river journey at dusk into night: flowing adventurous strings and French horns, sense of wonder and motion, a surge of excitement, then calm moonlit stillness. Loops smoothly.`, seconds: 90 },
  stealth: { prompt: `${SCORE} Sneaking into an enemy camp at dawn: quiet pizzicato strings, soft ticking percussion, low clarinet, tense and sneaky, playful suspense. Loops smoothly.`, seconds: 70 },
  victory: { prompt: `${SCORE} Final battle into victory: heroic full orchestra with choir-like pads and big drums, triumphant brass melody, then a warm peaceful sunrise ending with harp and strings.`, seconds: 90 },
} as const satisfies Record<string, MusicSpec>;

export type SfxId = keyof typeof SFX;
export type MusicId = keyof typeof MUSIC;

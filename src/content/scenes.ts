// Per-page atmosphere: what you hear, see and feel around the words.
// Cues are anchored to phrases of James's text (not times), so they fire when the
// narrator (or the reader's reveal) reaches those words. tests/scenes.test.ts
// checks every phrase exists on its page.
import type { MusicId, SfxId } from './sound.ts';

export type Grade = 'calm-night' | 'fire-night' | 'underwater' | 'river-night' | 'day' | 'dusk' | 'moon' | 'dawn' | 'battle' | 'sunrise';
export type ParticleKind = 'embers' | 'ash' | 'dust' | 'bubbles' | 'fireflies' | 'motes' | 'mist' | 'spray' | 'sparkles';
export type Interaction = 'cards' | 'count' | 'fires';

export interface Cue {
  /** Exact phrase from the page text; the cue fires when its first character is revealed. */
  readonly phrase: string;
  readonly sfx?: SfxId;
  /** Camera shake strength 0..1. */
  readonly shake?: number;
  /** Burst the word off the page as big punch-in type (sound words). */
  readonly punch?: boolean;
  /** Brief bright flash of the scene light. */
  readonly flash?: boolean;
  readonly burst?: ParticleKind;
}

export interface Scene {
  readonly music: MusicId;
  readonly ambience: readonly SfxId[];
  readonly grade: Grade;
  readonly particles: Readonly<Partial<Record<ParticleKind, number>>>;
  /** Played as the spread settles, before narration. */
  readonly enter?: SfxId;
  /** Camera pushes into the art (and its wide version) before the text. */
  readonly pushIn?: boolean;
  readonly underwater?: boolean;
  readonly cues?: readonly Cue[];
  readonly interaction?: Interaction;
}

export const SCENES: Readonly<Record<string, Scene>> = {
  'two-tribes': { music: 'theme', ambience: ['night-jungle-loop'], grade: 'calm-night', particles: { fireflies: 0.5, embers: 0.15 } },
  'roof-collapse': {
    music: 'attack', ambience: ['fire-loop'], grade: 'fire-night', particles: { embers: 0.8, dust: 0.6 },
    cues: [
      { phrase: 'Boom!', sfx: 'roof-collapse', shake: 1, punch: true, flash: true, burst: 'dust' },
      { phrase: 'Crsh!!', shake: 0.7, punch: true, burst: 'dust' },
      { phrase: 'The ground beneath me was rumbling', sfx: 'rumble', shake: 0.35 },
    ],
  },
  'village-fire': {
    music: 'attack', ambience: ['fire-loop'], grade: 'fire-night', particles: { embers: 1, ash: 0.4 },
    cues: [
      { phrase: 'All I can see was fire', flash: true },
      { phrase: 'Trying to put out the fires', sfx: 'water-whoosh', burst: 'spray' },
      { phrase: 'was no use', sfx: 'steam-hiss' },
    ],
  },
  uppercut: {
    music: 'attack', ambience: ['fire-loop'], grade: 'fire-night', particles: { embers: 0.8, ash: 0.3 },
    cues: [{ phrase: 'diving uppercut', sfx: 'punch', shake: 0.5, flash: true, burst: 'spray' }],
  },
  dragons: {
    music: 'attack', ambience: ['fire-loop'], grade: 'fire-night', particles: { embers: 1, ash: 0.7 }, enter: 'wing-gust', pushIn: true,
    cues: [{ phrase: 'dragons', sfx: 'dragon-roar', shake: 0.8 }],
  },
  'lake-dive': { music: 'sorrow', ambience: ['underwater-loop'], grade: 'underwater', particles: { bubbles: 1 }, enter: 'dive-splash', pushIn: true, underwater: true },
  'amazon-night': { music: 'sorrow', ambience: ['night-jungle-loop'], grade: 'river-night', particles: { fireflies: 1 } },
  training: { music: 'hope', ambience: ['river-day-loop'], grade: 'day', particles: { motes: 0.8 } },
  'team-intro': {
    music: 'hope', ambience: ['river-day-loop'], grade: 'day', particles: { motes: 0.6 }, interaction: 'cards',
    cues: [{ phrase: 'Oh wait...', sfx: 'record-scratch' }],
  },
  'dusk-setoff': { music: 'hope', ambience: ['night-jungle-loop'], grade: 'dusk', particles: { motes: 0.4, fireflies: 0.4 } },
  'river-swim': {
    music: 'journey', ambience: ['rapids-loop'], grade: 'dusk', particles: { spray: 0.3 },
    cues: [{ phrase: 'SPLASH!', sfx: 'splash-big', shake: 0.6, punch: true, burst: 'spray' }],
  },
  waterfall: { music: 'journey', ambience: ['waterfall-loop'], grade: 'river-night', particles: { mist: 1, spray: 0.4 }, pushIn: true },
  'vine-leap': {
    music: 'journey', ambience: ['waterfall-loop'], grade: 'river-night', particles: { mist: 0.6 }, interaction: 'count',
    cues: [{ phrase: 'We leaped onto the vines', sfx: 'vine-whoosh', burst: 'sparkles' }],
  },
  'moonlit-camp': { music: 'journey', ambience: ['night-jungle-loop'], grade: 'moon', particles: { fireflies: 0.7 } },
  'sneak-camp': { music: 'stealth', ambience: ['dawn-loop', 'camp-loop'], grade: 'dawn', particles: { mist: 0.8, motes: 0.3 } },
  'last-fire': {
    music: 'stealth', ambience: ['camp-loop'], grade: 'dawn', particles: { embers: 0.4, mist: 0.3 }, interaction: 'fires',
    cues: [{ phrase: 'we put out the last fire', sfx: 'steam-hiss', burst: 'spray' }],
  },
  'final-battle': {
    music: 'victory', ambience: ['camp-loop'], grade: 'battle', particles: { embers: 0.6, spray: 0.6, sparkles: 0.4 }, enter: 'battle-clash', pushIn: true,
    cues: [{ phrase: 'we won', sfx: 'victory-sparkle', burst: 'sparkles', flash: true }],
  },
  peace: {
    music: 'victory', ambience: ['dawn-loop'], grade: 'sunrise', particles: { motes: 1, sparkles: 0.2 },
    cues: [{ phrase: 'The End.', sfx: 'victory-sparkle', burst: 'sparkles' }],
  },
};

/** Character cards for the "Let me introduce ourselves" page; each lights up as its name is read. */
export const TEAM = [
  { name: 'Kyle', power: 'Water whip', colour: '#1f8aa0' },
  { name: 'Logan', power: 'Ice shield', colour: '#8fc9e8' },
  { name: 'Ruby', power: 'Water jets', colour: '#e0795c' },
  { name: 'Zoro', power: 'Mist', colour: '#9a8fbf' },
  { name: 'Flora', power: 'Vines', colour: '#6fb36a' },
] as const;

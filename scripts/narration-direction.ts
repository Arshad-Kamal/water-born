// Delivery direction for the narrator, one audio tag (or '') per block of each page.
// Tags steer how a line is performed and are not spoken, so the story stays verbatim.
// tests/narration.test.ts checks every page has exactly one entry per block.

export const DIRECTION: Readonly<Record<string, readonly string[]>> = {
  p01: ['[warm, storyteller voice]', '[softly, drawing the listener in]'],
  p02: ['[shouting]', '[shouting]', '[breathless, urgent]'],
  p03: ['[fast, frantic]'],
  p04: ['[determined]', '[fierce, excited]'],
  p05: ['[low, dread-filled voice]'],
  p06: ['[quiet, sad farewell]'],
  p07: ['[quiet, thoughtful, then resolved]'],
  p08: ['[proud, hopeful]', '[confident, getting excited]'],
  p09: ['[playful, talking to the reader]'],
  p10: ['[cheerful]', '[calm, brave]'],
  p11: ['[announcing a new chapter]', '[excited, picking up speed]', '[shouting]'],
  p12: ['[panicked]'],
  p13: ['[urgent]', '[counting, building up]', '[triumphant]'],
  p14: ['[hushed, moonlit calm]'],
  p15: ['[announcing a new chapter]', '[whispering, sneaky]'],
  p16: ['[tense, quick]'],
  p17: ['[fierce, heroic]'],
  p18: ['[warm, happy, relieved]', '[gently, softly]'],
};

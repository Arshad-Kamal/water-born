// Story text is James's, verbatim. Only page breaks and block kinds are editorial;
// tests/story-verbatim.test.ts fails if any word drifts from docs/story-original.md.

export type BlockKind = 'chapter' | 'text' | 'sound';

export interface Block {
  readonly kind: BlockKind;
  readonly text: string;
}

export interface Page {
  readonly id: string;
  /** Art/atmosphere slug; asset files and scene cues key off it. */
  readonly scene: string;
  readonly blocks: readonly Block[];
}

export interface Book {
  readonly title: string;
  readonly author: string;
  readonly pages: readonly Page[];
}

const chapter = (text: string): Block => ({ kind: 'chapter', text });
const text = (value: string): Block => ({ kind: 'text', text: value });
const sound = (value: string): Block => ({ kind: 'sound', text: value });

export const book: Book = {
  title: 'Water Born',
  author: 'James',
  pages: [
    {
      id: 'p01',
      scene: 'two-tribes',
      blocks: [
        chapter('Chapter 1: Under Attack'),
        text('Once upon a time, there were two tribes: Water and Fire. Here is how the story starts.'),
      ],
    },
    {
      id: 'p02',
      scene: 'roof-collapse',
      blocks: [
        sound('Boom!'),
        sound('Crsh!!'),
        text('The roof was slowly starting to go down. The ground beneath me was rumbling - We were under attack... again.'),
      ],
    },
    {
      id: 'p03',
      scene: 'village-fire',
      blocks: [
        text("I grabbed my family's last rations of food and leaped out of the house. All I can see was fire. Trying to put out the fires with my water power was no use."),
      ],
    },
    {
      id: 'p04',
      scene: 'uppercut',
      blocks: [
        text('We were forced to flee but I needed to put up a good fight first.'),
        text('I went in with a diving uppercut, catching a soldier off guard.'),
      ],
    },
    {
      id: 'p05',
      scene: 'dragons',
      blocks: [text('Then they brought out the dragons.')],
    },
    {
      id: 'p06',
      scene: 'lake-dive',
      blocks: [text('I jumped into the lake knowing I might never see this place again.')],
    },
    {
      id: 'p07',
      scene: 'amazon-night',
      blocks: [text('We settled down at the Amazon River. I thought that night... I need to bring back our home.')],
    },
    {
      id: 'p08',
      scene: 'training',
      blocks: [
        text('Lucky I had a group of resistence fighters willing to possibly risk their lives to bring back our home.'),
        text('We started by gathering resources and learning new moves. We were ready to go.'),
      ],
    },
    {
      id: 'p09',
      scene: 'team-intro',
      blocks: [
        text('Oh wait... Let me introduce ourselves. I am Kyle of the Water tribe, and this is Logan, Ruby, Zoro, and Flora.'),
      ],
    },
    {
      id: 'p10',
      scene: 'dusk-setoff',
      blocks: [text('Back to the story.'), text('It was evening as we decided to set off.')],
    },
    {
      id: 'p11',
      scene: 'river-swim',
      blocks: [
        chapter('Chapter 2: Rise of Water'),
        text("We swam down the river's twists and turns until..."),
        sound('SPLASH!'),
      ],
    },
    {
      id: 'p12',
      scene: 'waterfall',
      blocks: [text('Up ahead there was a waterfall! We went the wrong way! We needed to act fast.')],
    },
    {
      id: 'p13',
      scene: 'vine-leap',
      blocks: [
        text('Just then, we spotted vines at the top of the waterfall!'),
        text('One.. Two... And three!'),
        text('We leaped onto the vines.'),
      ],
    },
    {
      id: 'p14',
      scene: 'moonlit-camp',
      blocks: [
        text('When the moon was at its highest in the sky, we got close to our home. We needed a goodnight sleep to be prepared for tomorrow.'),
      ],
    },
    {
      id: 'p15',
      scene: 'sneak-camp',
      blocks: [
        chapter('Chapter 3: The Fall of Fire'),
        text('In the morning we snuck into the camp. Picking off the guards one by one.'),
      ],
    },
    {
      id: 'p16',
      scene: 'last-fire',
      blocks: [
        text('When we were putting out the fires one of the guards spotted us. As he came closer to us, we put out the last fire.'),
      ],
    },
    {
      id: 'p17',
      scene: 'final-battle',
      blocks: [text('There were 3 fire people left after the battle. We put all we had into that fight and we won.')],
    },
    {
      id: 'p18',
      scene: 'peace',
      blocks: [text('We can now live peacefully in the jungle.'), text('The End.')],
    },
  ],
};

/**
 * A page's blocks joined by single spaces. Positions in this string are the page's
 * character indices: narration timings, the ink reveal and scene cues all use them.
 */
export const pageText = (page: Page): string => page.blocks.map((b) => b.text).join(' ');

/** Index in `pageText(page)` where each block starts. */
export function blockStarts(page: Page): number[] {
  let index = 0;
  return page.blocks.map((b) => {
    const start = index;
    index += b.text.length + 1;
    return start;
  });
}

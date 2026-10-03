<!-- 2026-10-02 · ChatGPT image prompts written in session "Water Born 3D storybook". Derived from docs/art-bible.md (change the bible first, then regenerate prompts). -->
# Asset prompts

How to use:
- Paste each prompt into ChatGPT as its own message. If ChatGPT returns a square image, reply "Make it portrait 2:3, 1024×1536."
- Download the image and save it into the project folder `assets-in/` with the exact filename given. (`assets-in/` is not committed; your ChatGPT library keeps the originals.)
- If an image has text, a border or a watermark in it, reply "Remove all text and the border" and save the fixed one.

## Round 1: style tests (James picks one)

All three show the same moment, so the only difference is the style. Show James the three and ask which one looks like his story.

### Style A: painted storybook → `assets-in/style-a-painted.png`
```
A portrait 2:3 illustration for a children's adventure book. Kyle, an 11-year-old boy of the Water tribe, crouches on a wooden dock at the edge of a jungle lake at night. His right fist is wrapped in a swirling, glowing vortex of aqua-white water, ready to strike. He has light-brown skin, messy dark-brown hair with one blue streak, sea-blue eyes, a determined expression, a sleeveless teal tunic with a wave-pattern sash, wrapped forearms and a spiral-shell pendant. Behind him, across the dark water, his village of stilt houses with woven reed roofs is on fire; orange flames and embers reflect in the lake, and the rainforest silhouette rises against an indigo sky.
Style: rich hand-painted fantasy storybook illustration, gouache and oil textures with visible brushwork, glowing warm firelight against cool moonlit blues, soft painterly edges, deep atmosphere and depth, the feel of a classic illustrated adventure novel.
No text, letters, logos, borders, frames or watermarks. Kid-friendly adventure tone.
```

### Style B: anime adventure → `assets-in/style-b-anime.png`
```
A portrait 2:3 illustration for a children's adventure book. Kyle, an 11-year-old boy of the Water tribe, crouches on a wooden dock at the edge of a jungle lake at night. His right fist is wrapped in a swirling, glowing vortex of aqua-white water, ready to strike. He has light-brown skin, messy dark-brown hair with one blue streak, sea-blue eyes, a determined expression, a sleeveless teal tunic with a wave-pattern sash, wrapped forearms and a spiral-shell pendant. Behind him, across the dark water, his village of stilt houses with woven reed roofs is on fire; orange flames and embers reflect in the lake, and the rainforest silhouette rises against an indigo sky.
Style: cinematic hand-drawn anime feature-film style, clean confident line art, cel-shaded characters over lush painted backgrounds, dynamic action pose, vivid elemental effects with sparkling water droplets and bright embers, dramatic rim light.
No text, letters, logos, borders, frames or watermarks. Kid-friendly adventure tone.
```

### Style C: 3D animated film → `assets-in/style-c-3d.png`
```
A portrait 2:3 illustration for a children's adventure book. Kyle, an 11-year-old boy of the Water tribe, crouches on a wooden dock at the edge of a jungle lake at night. His right fist is wrapped in a swirling, glowing vortex of aqua-white water, ready to strike. He has light-brown skin, messy dark-brown hair with one blue streak, sea-blue eyes, a determined expression, a sleeveless teal tunic with a wave-pattern sash, wrapped forearms and a spiral-shell pendant. Behind him, across the dark water, his village of stilt houses with woven reed roofs is on fire; orange flames and embers reflect in the lake, and the rainforest silhouette rises against an indigo sky.
Style: stylized 3D animated feature-film render, expressive character with large eyes and appealing proportions, soft subsurface-scattered skin, detailed fabric and wet-water shading, volumetric firelight and moonlight, shallow depth of field, cinematic colour grading.
No text, letters, logos, borders, frames or watermarks. Kid-friendly adventure tone.
```

Result: James chose **A, painted** (2026-10-02). ChatGPT exports `.jpg` (1696×2528); saved as `assets-in/style-a-painted.jpg` etc. Any image extension is fine.

## Round 2: character sheets

Reference sheets that keep every later scene consistent; not book pages. Run all of round 2 (and later round 3) in ONE ChatGPT chat:
1. Start a new chat. Upload `assets-in/style-a-painted.jpg` with: "This is the art style and the main character, Kyle, for a children's book. Every image in this chat must match this exact painted style and these character designs. Never add text, labels, borders or watermarks."
2. Send each prompt below as its own message. If an image comes back with name labels or captions, reply "Remove all text".
3. Show James each sheet. If he wants a change (hair, colours, a power), tell me first so the art bible and prompt get updated before you regenerate.

### Kyle → `assets-in/char-kyle.jpg`
```
Character reference sheet, landscape 3:2, plain warm parchment background. Kyle, 11, the boy from the reference image: same face, messy dark-brown hair with one blue streak, sea-blue eyes, light freckles, sleeveless teal wrap tunic, blue wave-pattern sash, white wrapped forearms, dark knee-length trousers, barefoot, nautilus-shell pendant. Show him three times side by side: full body standing front view with a determined grin; full body three-quarter back view; and an action pose leaping into a diving uppercut with his fist wrapped in a glowing aqua-white water vortex. Add a head-and-shoulders close-up in the corner showing his brave smile.
Same hand-painted gouache storybook style as the reference image. No text, labels, names or watermarks.
```

### Logan → `assets-in/char-logan.jpg`
```
Character reference sheet, landscape 3:2, plain warm parchment background, same painted style and world as Kyle. Logan, 12, Kyle's friend from the Water tribe: the tallest and broadest of the group, sandy-blond cropped hair, pale freckled skin, grey-blue eyes, a steady protective expression. He wears a padded sky-blue vest over a sleeveless pale tunic with the same wave-pattern sash, wrapped forearms, dark trousers, woven sandals and a spiral-shell pendant. His power is ice: he carries a round shield of clear glowing ice and can freeze water into ice platforms. Show him three times side by side: full body front view, full body three-quarter back view, and an action pose bracing behind his ice shield as frost spreads across the ground. Add a head-and-shoulders close-up in the corner.
Same hand-painted gouache storybook style as the reference image. No text, labels, names or watermarks.
```

### Ruby → `assets-in/char-ruby.jpg`
```
Character reference sheet, landscape 3:2, plain warm parchment background, same painted style and world as Kyle. Ruby, 11, a girl of the Water tribe and the team's fearless scout: long copper-red braid, freckles, tan skin, green eyes, a quick confident grin. She wears a sleeveless teal-and-coral tunic with a coral wave-pattern sash, wrapped forearms, dark knee-length trousers, woven sandals and a spiral-shell pendant. Her power is riding water currents: glowing jets of water under her feet launch her into huge leaps and fast dashes. Show her three times side by side: full body front view, full body three-quarter back view, and an action pose mid-leap high in the air on a jet of glowing water. Add a head-and-shoulders close-up in the corner.
Same hand-painted gouache storybook style as the reference image. No text, labels, names or watermarks.
```

### Zoro → `assets-in/char-zoro.jpg`
```
Character reference sheet, landscape 3:2, plain warm parchment background, same painted style and world as Kyle. Zoro, 12, a boy of the Water tribe, calm and watchful: dark-brown skin, short twists, thoughtful dark eyes. He wears a grey-violet hooded sleeveless tunic with a wave-pattern sash, wrapped forearms, dark trousers, woven sandals and a spiral-shell pendant, and carries a carved driftwood staff with a wave spiral at the top. His power is mist: he summons soft silver-violet fog that hides his friends. Show him three times side by side: full body front view, full body three-quarter back view, and an action pose raising his staff as swirling mist pours out around him. Add a head-and-shoulders close-up in the corner.
Same hand-painted gouache storybook style as the reference image. No text, labels, names or watermarks.
```

### Flora → `assets-in/char-flora.jpg`
```
Character reference sheet, landscape 3:2, plain warm parchment background, same painted style and world as Kyle. Flora, 10, the youngest of the group, a girl of the Water tribe and the team's healer: curly black hair with small white flowers tucked in it, brown skin, warm brown eyes, a kind but brave smile. She wears a sleeveless leaf-green tunic with a wave-pattern sash, wrapped forearms, dark knee-length trousers, woven sandals and a spiral-shell pendant. Her power is plants: with a touch of glowing water she makes jungle vines grow and twist where she wants. Show her three times side by side: full body front view, full body three-quarter back view, and an action pose with both hands raised as glowing green-and-aqua vines spiral up from the ground. Add a head-and-shoulders close-up in the corner.
Same hand-painted gouache storybook style as the reference image. No text, labels, names or watermarks.
```

### Fire soldier → `assets-in/char-fire-soldier.jpg`
```
Character reference sheet, landscape 3:2, plain warm parchment background, same painted style and world. A soldier of the Fire tribe, the villains of a children's adventure: an adult in charcoal-black armour with glowing ember-orange seams, bronze shoulder plates, and a helmet with a flame-shaped crest that shadows the face, so they look menacing but not gory. A small fireball flickers in one gloved hand. Show the soldier three times side by side: full body front view, full body three-quarter back view, and an action pose throwing a fireball. Add a close-up of the helmet in the corner.
Same hand-painted gouache storybook style as the reference image. Kid-friendly. No text, labels, names or watermarks.
```

### Dragon → `assets-in/char-dragon.jpg`
```
Creature reference sheet, landscape 3:2, plain warm parchment background, same painted style and world. A war dragon of the Fire tribe, about the size of a house: lean and powerful, crimson-and-charcoal scales with cracks of glowing molten orange between them, wide wings with glowing veins, golden eyes, smoke curling from its nostrils, a heavy iron collar with a broken chain. Show it twice: a full side view standing with wings spread, and a front three-quarter view rearing up and roaring with a glow in its throat. Add a close-up of its head and golden eye in the corner.
Same hand-painted gouache storybook style as the reference image. Fearsome but suitable for an 11-year-old reader. No text, labels, names or watermarks.
```

## Round 3: scene illustrations p01–p18, cover, push-in wides (written after round 2)
- Candidate reuse: `style-a-painted.jpg` (Kyle on the dock, village burning) fits p03 "All I can see was fire"; decide in round 3.

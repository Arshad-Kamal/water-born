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

Result: all 7 sheets generated 2026-10-03, saved as `assets-in/char-*.jpg`.

## Round 3: book art (26 images)

How to run:
- Use a fresh ChatGPT chat per batch (long chats drift). Open each chat by uploading `style-a-painted.jpg` with the same opening message as round 2.
- Each prompt lists **Attach**: upload those sheets with that prompt, every time, even if they're already in the chat.
- Portrait = 2:3 (1024×1536 or larger); landscape = 3:2. If the shape is wrong, reply "Make it portrait 2:3" / "Make it landscape 3:2".
- p03 is already done: `style-a-painted.jpg` is the page 3 art.
- Batch A first: the design mockup uses those images.

### Batch A: mockup set

#### Chapter 1 backdrop → `assets-in/plate-ch1.jpg`
Attach: nothing extra.
```
Landscape 3:2 environment painting with no people: a jungle lake at night seen from low on the water. Calm black-teal water with glassy moonlit reflections fills the lower half; a ring of dark rainforest silhouettes, a thin crescent moon and stars above. Far in the distance on the left, a soft orange glow of fire and drifting smoke on the horizon. Very simple, quiet composition with large calm areas and no focal subject, because it sits behind a storybook as a softly blurred backdrop.
Same hand-painted gouache storybook style as the reference image. No text, letters, borders or watermarks.
```

#### Cover → `assets-in/cover.jpg`
Attach: char-kyle, char-logan, char-ruby, char-zoro, char-flora, char-dragon.
```
Portrait 2:3 book-cover painting for a children's adventure book. The five Water tribe kids stand together on wet rocks in the middle of a jungle river at night, ready for battle, seen from slightly below: Kyle in the centre front with a glowing aqua water vortex spiralling around his raised fist; Logan with his ice shield; Ruby crouched to leap; Zoro with his staff trailing mist; Flora with glowing vines curling around her arms. Behind them, far away, their stilt-house village glows orange with fire and a crimson dragon silhouette circles in the smoke. Moonlight rims them in blue; firelight warms the river.
Keep the top third of the image as calm, dark, starry sky with nothing important in it (the title will be placed there).
Same hand-painted gouache storybook style and character designs as the reference images. No text, title, letters, borders or watermarks.
```

#### p02 Boom! Crsh!! → `assets-in/p02-roof-collapse.jpg`
Attach: char-kyle.
```
Portrait 2:3 illustration. Night, inside Kyle's small stilt house of woven reed walls and wooden beams. The roof is caving in: a burning beam cracks and drops, splinters and dust rain down, orange firelight pours through the gaps in the roof. The floor shakes: clay pots and a hanging glass-float lantern swing and topple. Kyle, 11, braces in the middle of the room, looking up in alarm, one arm raised to shield his face. Strong warm firelight from above, cool blue moonlight through the doorway behind him.
Same hand-painted gouache storybook style and character designs as the reference images. Kid-friendly, exciting, nobody hurt. No text, letters, borders or watermarks.
```

### Batch B: Chapter 1 (in a fresh chat)

#### p01 Two tribes → `assets-in/p01-two-tribes.jpg`
Attach: char-fire-soldier.
```
Portrait 2:3 storybook opening illustration, "once upon a time" feeling, no close-up characters. A grand view of two lands divided by a wide river. Bottom half: the peaceful Water tribe village of stilt houses with woven reed roofs on a jade jungle lake, sky-blue awnings, carved wave-spiral totems, rope bridges, glass-float lanterns, small canoes, waterfalls in the green hills. Top half, beyond the river and far away: the Fire tribe's volcanic badlands, black rock and glowing orange lava rivers under a smoky red sky, tiny dark banners with a flame emblem. Cool blues and greens below, warm oranges above, meeting at the river.
Same hand-painted gouache storybook style as the reference images. No text, letters, borders or watermarks.
```

#### p04 The diving uppercut → `assets-in/p04-uppercut.jpg`
Attach: char-kyle, char-fire-soldier.
```
Portrait 2:3 action illustration. In the burning Water tribe village at night, Kyle, 11, launches into a diving uppercut, his fist wrapped in a glowing aqua-white water vortex, catching a fire soldier completely off guard: the soldier is knocked backwards off his feet in a burst of water spray, his flame-crested helmet tipping off, his fireball fizzling into steam. Behind them, villagers flee to canoes on the lake under the orange glow of burning roofs.
Same hand-painted gouache storybook style and character designs as the reference images. Kid-friendly cartoon action, nobody hurt. No text, letters, borders or watermarks.
```

#### p05 The dragons → `assets-in/p05-dragons.jpg`
Attach: char-dragon, char-fire-soldier, char-kyle.
```
Portrait 2:3 illustration, dramatic low angle. Fire soldiers lead two huge war dragons on heavy chains through the burning Water tribe village. The nearest dragon rears up and roars, wings spread wide against a sky of smoke and embers, a molten glow in its throat. In the bottom corner, small in the foreground and seen from behind, Kyle looks up at it.
Same hand-painted gouache storybook style and character designs as the reference images. Fearsome but suitable for an 11-year-old. No text, letters, borders or watermarks.
```

#### p05 wide → `assets-in/p05-dragons-wide.jpg`
Attach: char-dragon, char-fire-soldier.
```
Landscape 3:2 cinematic version of the same scene: a wide panorama of the burning Water tribe village at night as two huge war dragons on chains are led in by fire soldiers, the nearest dragon rearing and roaring with wings spread across the whole width of the image, smoke and embers filling the sky.
Same hand-painted gouache storybook style and character designs as the reference images. Fearsome but suitable for an 11-year-old. No text, letters, borders or watermarks.
```

#### p06 Into the lake → `assets-in/p06-lake-dive.jpg`
Attach: char-kyle.
```
Portrait 2:3 underwater illustration. Kyle, 11, has just dived into the dark jungle lake and swims down and away, a trail of silver bubbles behind him, his hands glowing faintly aqua. Above him the water's surface glows orange from the burning village, with wavering light rays reaching down. Reeds, a few small fish scattering, deep teal darkness below. A quiet, sad, farewell feeling.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

#### p06 wide → `assets-in/p06-lake-dive-wide.jpg`
Attach: char-kyle.
```
Landscape 3:2 cinematic version of the same scene: wide underwater view of the dark jungle lake, Kyle small in the middle swimming away with a trail of bubbles, the surface above glowing orange from the burning village, light rays slanting down, reeds and deep teal darkness.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

#### p07 The Amazon River → `assets-in/p07-amazon-night.jpg`
Attach: char-kyle.
```
Portrait 2:3 illustration. Night on the bank of the wide Amazon River. A small new camp of the Water tribe: lean-to shelters of palm leaves, glass-float lanterns, canoes pulled up on the mud, families resting. In the foreground Kyle, 11, sits alone on a mangrove root at the water's edge, hugging his knees, looking out over the river toward home with a determined face. Fireflies, giant lily pads, a big moon reflected in the water.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

#### p08 Training → `assets-in/p08-training.jpg`
Attach: all five kid sheets.
```
Portrait 2:3 illustration, sunny day on a sandbar of the Amazon River: the five Water tribe kids train and prepare together. Kyle practises a water whip; Logan freezes river water into an ice platform; Ruby leaps high on a jet of water; Zoro sends mist rolling across the sand; Flora makes vines curl up a tree. Woven baskets of gathered fruit, coconuts and supplies sit nearby. Energetic, hopeful mood, bright greens and river blues.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

#### p09 Let me introduce ourselves → `assets-in/p09-team.jpg`
Attach: all five kid sheets.
```
Portrait 2:3 heroic team portrait, like a movie poster, the five kids facing the viewer on a jungle riverbank. Kyle in the centre front, grinning and pointing his thumb at himself; around him Logan with arms crossed and his ice shield on his back, Ruby with hands on hips, Zoro leaning on his staff with a small smile, Flora waving with a vine curling around her wrist. Each has a soft glow of their power. Simple soft background so the five stand out.
Same hand-painted gouache storybook style and character designs as the reference images. No text, names, letters, borders or watermarks.
```

#### p10 Setting off → `assets-in/p10-dusk-setoff.jpg`
Attach: all five kid sheets.
```
Portrait 2:3 illustration. Evening: the five kids stand on a big rock at the edge of the Amazon River, seen from behind as silhouettes rimmed in gold, looking downriver toward home. A huge amber-and-violet sunset sky reflected in the water, the first stars appearing, birds flying home. Calm, brave, the start of a journey.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

### Batch C: Chapters 2 and 3 (in a fresh chat)

#### p11 Down the river, SPLASH! → `assets-in/p11-river-swim.jpg`
Attach: all five kid sheets.
```
Portrait 2:3 action illustration at dusk. The five kids swim fast down a winding jungle river, carried by streams of glowing water power: Ruby ahead on a water jet, Logan on a small ice raft, Kyle in front bursting through a huge white splash of water that sprays toward the viewer. The river twists away through the jungle; the last orange light of dusk on the water.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

#### p12 The waterfall → `assets-in/p12-waterfall.jpg`
Attach: all five kid sheets.
```
Portrait 2:3 illustration, early night. The river suddenly ends at the edge of an enormous jungle waterfall; the five kids are swept toward the drop, eyes wide, reaching out, the roaring falls plunging into misty darkness below. Spray and mist glow silver in the rising moonlight. Thick vines hang from the trees at the top of the falls.
Same hand-painted gouache storybook style and character designs as the reference images. Exciting, not scary. No text, letters, borders or watermarks.
```

#### p12 wide → `assets-in/p12-waterfall-wide.jpg`
Attach: all five kid sheets.
```
Landscape 3:2 cinematic version of the same scene: a vast jungle waterfall seen from the side at early night, the five kids tiny at the very edge being swept toward the drop, the falls plunging into a canyon of mist glowing in moonlight, vines hanging at the top.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

#### p13 One.. Two... And three! → `assets-in/p13-vine-leap.jpg`
Attach: all five kid sheets.
```
Portrait 2:3 action illustration. At the top of the waterfall the five kids leap through the air onto thick hanging vines; Flora's power makes the vines glow green and reach out to catch them. Kyle grabs a vine mid-swing, Ruby flies highest, Logan and Zoro catch hold, Flora swings with a vine wrapped around her arm. The waterfall thunders below, moonlit mist rising.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

#### p14 The moon at its highest → `assets-in/p14-moonlit-camp.jpg`
Attach: all five kid sheets.
```
Portrait 2:3 illustration. A full moon high in a starry sky. On a jungle hilltop the kids rest in hammocks woven from vines; Zoro sits awake keeping watch, wrapped in faint mist. Below, in the valley, their home village on the lake can be seen in the distance, now a Fire tribe camp of black tents and small orange fires. Deep blue and silver light, peaceful but tense.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

#### p15 Sneaking into the camp → `assets-in/p15-sneak-camp.jpg`
Attach: all five kid sheets, char-fire-soldier.
```
Portrait 2:3 illustration at dawn, pink-gold light through the trees. Hidden in Zoro's rolling mist, the kids sneak into the Fire tribe camp built among the stilt houses of their old village: black tents, iron fire braziers, flame-emblem banners. They are picking off the guards one by one: one guard frozen to the ankles in Logan's ice, another fast asleep wrapped in Flora's vines, another trapped inside a floating bubble of Kyle's water. Ruby peeks out from behind a tent.
Same hand-painted gouache storybook style and character designs as the reference images. Kid-friendly and a little funny, nobody hurt. No text, letters, borders or watermarks.
```

#### p16 The last fire → `assets-in/p16-last-fire.jpg`
Attach: char-kyle, char-logan, char-ruby, char-fire-soldier.
```
Portrait 2:3 action illustration, morning. In the Fire tribe camp the kids are putting out the fires: braziers hiss into clouds of steam. A fire soldier has spotted them and strides toward them, pointing. At the same moment Kyle sends a huge curling wave crashing over the last big bonfire, putting it out in an explosion of white steam.
Same hand-painted gouache storybook style and character designs as the reference images. Kid-friendly. No text, letters, borders or watermarks.
```

#### p17 The battle → `assets-in/p17-final-battle.jpg`
Attach: all five kid sheets, char-fire-soldier.
```
Portrait 2:3 epic action illustration, morning sunlight breaking through smoke. The five kids face the last three fire soldiers in the middle of their village. All their powers combine at once: Kyle's water vortex, Logan's ice, Ruby's water jet, Zoro's mist and Flora's vines meet the soldiers' fireballs in a giant explosion of steam and sparkling droplets in the centre. The kids are winning; the soldiers stagger back.
Same hand-painted gouache storybook style and character designs as the reference images. Kid-friendly, nobody hurt. No text, letters, borders or watermarks.
```

#### p17 wide → `assets-in/p17-final-battle-wide.jpg`
Attach: all five kid sheets, char-fire-soldier.
```
Landscape 3:2 cinematic version of the same scene: the five kids on the left, the last three fire soldiers on the right, their water, ice, mist and vine powers meeting the soldiers' fireballs in a huge explosion of steam and light in the centre, morning sun breaking through the smoke above.
Same hand-painted gouache storybook style and character designs as the reference images. Kid-friendly, nobody hurt. No text, letters, borders or watermarks.
```

#### p18 Peace in the jungle → `assets-in/p18-peace.jpg`
Attach: all five kid sheets.
```
Portrait 2:3 illustration, golden sunrise. The Water tribe village is peaceful again: the fires are out, families are returning by canoe, someone is fixing a roof. The five kids sit together on the dock with their feet in the lake, laughing. A rainbow arcs through the mist of a waterfall in the green hills, colourful birds fly over the jungle. Warm, happy ending.
Same hand-painted gouache storybook style and character designs as the reference images. No text, letters, borders or watermarks.
```

### Batch D: backdrops and endpapers (any chat)

#### Chapter 2 backdrop → `assets-in/plate-ch2.jpg`
```
Landscape 3:2 environment painting with no people: a wide jungle river at dusk turning to moonlit night, amber light fading on the left into deep blue on the right, mist above the water, distant waterfall haze, silhouetted trees. Very simple, quiet composition with large calm areas and no focal subject, because it sits behind a storybook as a softly blurred backdrop.
Same hand-painted gouache storybook style as the reference image. No text, letters, borders or watermarks.
```

#### Chapter 3 backdrop → `assets-in/plate-ch3.jpg`
```
Landscape 3:2 environment painting with no people: a jungle lake at sunrise, pink and gold sky, soft morning mist on still water, palm and rainforest silhouettes, a faint rainbow in the mist. Very simple, quiet composition with large calm areas and no focal subject, because it sits behind a storybook as a softly blurred backdrop.
Same hand-painted gouache storybook style as the reference image. No text, letters, borders or watermarks.
```

#### Endpapers → `assets-in/endpaper.jpg`
```
Square seamless repeating pattern for the inside covers of a storybook: hand-painted deep teal background with lighter aqua and pearl wave spirals, small shells and water droplets, in a classic decorative endpaper style. Flat, even lighting, the pattern tiles seamlessly on all edges.
Same hand-painted gouache texture as the reference image. No text, letters, borders or watermarks.
```

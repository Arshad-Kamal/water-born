# docs/

## Purpose
Durable non-code records for the Water Born storybook: plan, story source, verified stack facts, and (later) art bible and asset prompts.

## Ownership
Owned by the root AGENTS.md workflow. Source code lives in `src/`, tests in `tests/`.

## Local Contracts
- `story-original.md` is James's story verbatim. Never edit the story text; `tests/story-verbatim.test.ts` reads it as the source of truth.
- `plan.md` holds the live status block (overwrite in place, max 6 lines) and every product decision.

## Work Guidance
- Each file starts with a one-line provenance header (date + what produced it).

## Verification
- `npm test` checks the book text against `story-original.md`.

## Child DOX Index
Loose files:
- `plan.md`: approved plan, decisions, scene design table, step checklist, live status.
- `story-original.md`: verbatim story by James (source of truth).
- `stack-notes.md`: verified toolchain, ElevenLabs API, and hosting facts with dates.
- `art-bible.md`: art coherence file (format rules, world, characters, palette). Change it first; prompts derive from it.
- `mockups/`: screenshots of approved/proposed design-sandbox iterations (source of truth is `.sayl/sandboxes/`).
- `asset-prompts.md`: copy-paste ChatGPT prompts by round, with target filenames in `assets-in/` (gitignored raw drop folder).

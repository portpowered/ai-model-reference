# Whisper Model Page — Relevant Files

Work item: `whisper-model-page-current-main`. Page-local canonical model slice for
`/docs/models/whisper` backed by `model.whisper`.

## Preflight duplicate guard (story 001)

Before authoring Whisper content, verify current source:

| Artifact | Path |
| --- | --- |
| Page bundle | `src/content/docs/models/whisper/` |
| Model registry | `src/content/registry/models/whisper.json` |

If either already exists on the branch base, update only missing page-local pieces;
do not create duplicate `model.whisper` records, alternate Whisper slugs, or shadow
routes.

Focused observable guard: `src/lib/content/whisper-duplicate-guard.test.ts`.

## Routine page-local scope

Follow [content-page-generation-workflow-relevant-files.md](./content-page-generation-workflow-relevant-files.md)
for bundle shape, `make validate-data`, and owned-surface audit. Avoid active
BERT, T5, Gemma, and Flux model-family lanes.

## Registry record (story 002)

| Artifact | Path |
| --- | --- |
| Model registry | `src/content/registry/models/whisper.json` |
| Paper citation | `src/content/registry/citations/whisper-robust-speech-recognition.json` |
| Repository citation | `src/content/registry/citations/whisper-repository.json` |
| Model card citation | `src/content/registry/citations/whisper-large-huggingface.json` |

Focused observable guard: `src/lib/content/whisper-model-registry.test.ts`.

Relationship targets wired on `model.whisper`:

- `concept.encoder-decoder`, `concept.tokenizers-overview`, `concept.multimodal-model`, `concept.modality`
- `module.cross-attention`, `module.multi-head-attention`, `module.bpe`, `module.layer-norm`

## Page bundle (story 003)

| Artifact | Path |
| --- | --- |
| Page MDX | `src/content/docs/models/whisper/page.mdx` |
| English messages | `src/content/docs/models/whisper/messages/en.json` |
| Local assets | `src/content/docs/models/whisper/assets.json` |

Focused observable guard: `src/lib/content/whisper-model-page.test.tsx`.

Story 005 adds `graph.whisper-architecture`, `assets.json` wiring, localized graph labels, and `ModelArchitectureGraph` in the architecture section.

## Architecture teaching graph (story 005)

| Artifact | Path |
| --- | --- |
| Graph registry | `src/content/registry/graphs/whisper-architecture.json` |
| Local assets | `src/content/docs/models/whisper/assets.json` (`architectureGraph`) |
| Graph labels / alt | `src/content/docs/models/whisper/messages/en.json` (`assets`, `graph`) |

Focused observable guard: `src/lib/content/whisper-architecture-graph.test.tsx`.

## Architecture and training narrative (story 004)

Story 004 deepens localized copy in `messages/en.json` only:

- Opening and section prose introduce OpenAI's Whisper model family before shorthand.
- `inputsAndOutputs` distinguishes automatic speech recognition transcription from speech translation.
- `architecture` walks audio → spectrogram-like features → encoder → decoder → text tokens.
- `training` frames weak supervision and robustness goals from linked primary sources without benchmark-leaderboard framing.
- Prose auto-link phrases (`encoder-decoder architecture`, `tokenizers overview`, `multimodal models`, `model family`) surface inline discovery links via `ProseAutoLinkText`.

Focused observable guard extensions live in `src/lib/content/whisper-model-page.test.tsx` under the architecture/training narrative tests.

## Slice verification (story 006)

Consolidated review-facing proof for registry/page validation, link resolution,
search and tag discovery, and browser-visible route success:

| Artifact | Path |
| --- | --- |
| Slice verification tests | `src/lib/content/whisper-slice-verification.test.tsx` |

Quality gates: `bun run typecheck`, `make validate-data`, `make linkcheck`, and
focused whisper tests (`bun test src/lib/content/whisper-*.test.ts*`).

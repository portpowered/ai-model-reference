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

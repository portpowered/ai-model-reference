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

## Related targets to wire in later stories

Reuse or add only when absent:

- `concept.encoder-decoder` (architecture relationship)
- Tokenization module/concept records already on main
- Audio or multimodal concept records (for example `concept.multimodal-model`)
- OpenAI Whisper paper/repository/model-card citation records

# CLIP Model Current Main Reconciliation Notes

Reconciliation of the stale `clip-model-page` branch against `origin/main` as of
`e0c20103` (2026-07-01 UTC). Use these notes when publishing stories 002–005.

## Origin/main prerequisites (available now)

| Record | Path / id | Status |
| --- | --- | --- |
| CLIP paper page | `src/content/docs/papers/learning-transferable-visual-models-from-natural-language-supervision/` | published |
| CLIP paper registry | `paper.learning-transferable-visual-models-from-natural-language-supervision` | published |
| CLIP citation | `citation.learning-transferable-visual-models-from-natural-language-supervision` | published |
| CLIP image tokenization module | `module.clip-image-tokenization` + page bundle | published |
| Concept targets | `concept.conditioning`, `concept.encoder`, `concept.patch`, `concept.multimodal-model`, `concept.embedding`, `concept.token` | published |

**Not on origin/main:** `model.clip`, `model.stable-diffusion`, `/docs/models/clip`.

## Stale branch salvage inventory (`clip-model-page`)

Salvage as-is or with minor reconciliation:

| Artifact | Stale path | Verdict |
| --- | --- | --- |
| Page bundle | `src/content/docs/models/clip/page.mdx` | salvage — matches current model-page section pattern (gpt-3, llama-3) |
| Messages | `src/content/docs/models/clip/messages/en.json` | salvage — expands CLIP acronym, explains dual-encoder / no pixel generation |
| Assets | `src/content/docs/models/clip/assets.json` | salvage — `graph.clip-architecture` wiring is valid |
| Architecture graph | `src/content/registry/graphs/clip-architecture.json` | salvage — graph node `registryId` targets exist on main |
| Registry record | `src/content/registry/models/clip.json` | reconcile — see gaps below |
| Tests | `clip-model-*.test.{ts,tsx}` | reconcile — update relationship expectations |

## Registry reconciliation gaps

The stale `model.clip` record predates main's CLIP paper and image-tokenization
module. When publishing, update the stale registry rather than copying blindly:

| Field | Stale value | Reconciled target |
| --- | --- | --- |
| `relatedIds` | four concepts only | add `module.clip-image-tokenization` and `paper.learning-transferable-visual-models-from-natural-language-supervision` |
| `paperIds` | `[]` | `["paper.learning-transferable-visual-models-from-natural-language-supervision"]` |
| `moduleIds` | generic attention modules | keep attention modules **and** add `module.clip-image-tokenization` |
| Stable Diffusion | absent (correct) | omit — no `model.stable-diffusion` on main |

Do **not** add `model.stable-diffusion` to `relatedIds`; the stale test
`does not invent a Stable Diffusion related link` remains valid on main.

## Stale assumptions to drop

- Treating CLIP paper / citation as future work — they are published on main.
- Omitting `module.clip-image-tokenization` from model relationships — the module
  page and registry record exist and should be linked from `model.clip`.
- Any placeholder or broken Stable Diffusion href — no canonical target exists.

## Test reconciliation

| Test file | Change needed |
| --- | --- |
| `clip-model-record.test.ts` | Extend required `relatedIds` to include module and paper ids from main |
| `clip-model-page.test.tsx` | Expect `module.clip-image-tokenization` in `moduleIds`; keep graph and glossary link assertions |
| `clip-model-discovery.test.tsx` | Salvage discovery queries; verify glossary back-links still resolve after publish |

## Implementation order (remaining PRD stories)

1. **002** — Publish page bundle (salvaged MDX, messages, assets).
2. **003** — Publish reconciled `model.clip` registry with current-main ids.
3. **004** — Publish `graph.clip-architecture` (salvaged graph).
4. **005** — Port reconciled tests; run `make validate-data`.

## Verification commands

```bash
make validate-data
make typecheck
bun test src/lib/content/clip-model-record.test.ts
bun test src/lib/content/clip-model-page.test.tsx
bun test src/lib/content/clip-model-discovery.test.tsx
```

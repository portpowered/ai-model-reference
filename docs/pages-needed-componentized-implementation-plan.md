# Pages Needed Componentized Implementation Plan

This document is the phase-scoped implementation bridge between
`docs/documentation-site-pages-needed.md` and the Model Atlas repository as it
exists on branch `pages-needed-componentized-implementation-plan`. It names what
was already present when planning started, what this bridge queued and landed,
what remains on the authorized Phase 3 backlog, and what is explicitly deferred
through Phase 4 and later.

The machine-readable companion is
[`pages-needed-componentized-implementation-plan.json`](./pages-needed-componentized-implementation-plan.json).
Planners should treat the JSON as the queue source of truth and this markdown as
the human-readable reconciliation narrative.

## Problem

The original roadmap still lists many Phase 2 and Phase 3 topics as future work,
but the repository already shipped a broad glossary foundation, attention module
family, tag and search surfaces, and templates for every canonical docs kind. The
legacy scaffold CLI only generated `glossary` and `concept` bundles. Without a
repository-state bridge, the meta-planner could duplicate already-landed pages,
skip shared navigation and search integration, or drift into unauthorized
localization and later-phase families.

## Prerequisite: generator parity

**Status: landed** (`pages-needed-componentized-implementation-plan-001`)

Before expanding canonical page families beyond mixed manual scaffolding, every
canonical docs kind templated in `docs/templates/` must flow through one governed
page-spec workflow:

| Kind | Template path | Workflow |
| --- | --- | --- |
| concept | `docs/templates/concept/` | `bun run generate:page-bundle --spec page-specs/<slug>.json` |
| glossary | `docs/templates/glossary/` | same |
| module | `docs/templates/module/` | same |
| model | `docs/templates/model/` | same |
| paper | `docs/templates/paper/` | same |
| training-regime | `docs/templates/training-regime/` | same |

The workflow emits `page.mdx`, `messages/en.json`, `assets.json`, and the
matching registry record. It validates kind-specific required fields before file
writes and refuses partial writes on invalid input or path collisions. Legacy
`scaffold:doc-page` remains for glossary and concept only.

Verification gate: `src/lib/content/page-spec-workflow-generation.test.ts`.

## Smallest safe post-generator slice

**Status: landed** (`pages-needed-componentized-implementation-plan-002`)

The first post-generator slice is **not** new page authoring. It is shared
reconciliation for pages that already existed:

- navigation and browse indexes include published Phase 2 and Phase 3 pages
- `/tags/attention` lists all published attention modules by kind with working links
- architecture-forward navigation links to live transformer, diffusion-model,
  multimodal-model, and world-model pages
- search distinguishes Glossary, Concept, and Module results for representative
  queries such as transformer, MHA, MQA, RoPE, and context window

Verification gate: `make verify-phase-2-3-reconciliation-convergence`.

## Phase posture (present, missing, deferred)

### Phase 1 — present, do not reopen

| Area | Present now | Queue posture |
| --- | --- | --- |
| Docs shell and discovery surfaces | Home, search, glossary index, architecture index, tags index, dynamic docs route | Do not reopen except through shared reconciliation |
| Canonical exemplars | Grouped-query attention module, token glossary, attention tag landing | Treat as present |

### Phase 2 — present after reconciliation

| Area | Present now | Queue posture |
| --- | --- | --- |
| Foundations glossary | Broad Phase 2 glossary set including model, architecture, modality, token-to-probability chain | Treat as present |
| Forward-navigation families | transformer, diffusion-model, multimodal-model, world-model | Treat as present; verify through reconciliation |
| Discovery integration | Shared navigation, tags, and search reflect published pages | Landed via story 002 |

### Phase 3 — partial; remaining gaps are family-scoped

| Area | Present now | Still missing on authorized backlog |
| --- | --- | --- |
| Attention modules (core) | attention, MHA, MQA, GQA, MLA, sparse, sliding-window, linear | Extended variants: DeltaNet, local, global, dilated, block-sparse, ring, attention sinks |
| Architecture and sequence families | architectures-overview, sequence-model, SSM, RNN, CNN, GNN, encoder/decoder layout concepts | — (landed in story 003) |
| Attention-interaction concepts | self, cross, causal, bidirectional attention | — (landed in story 004) |
| Normalization and activation variants | standard-ffn, batch/group/qk norm, relu, leaky-relu, silu, swiglu | — (landed in story 005) |
| Positional and context-extension variants | absolute/learned/sinusoidal embeddings, relative/T5 bias, NoPE, SuperHOT, NTK-aware, YaRN, LongRoPE, PI | — (landed in story 006) |
| Tokenizer foundations | tokenizers-overview hub plus BPE, WordPiece, Unigram, SentencePiece, byte-level, vocabulary, special tokens, chat templates, mismatch | — (landed in story 007) |
| Shared components | feed-forward-network, normalization, layer-norm, rmsnorm, mixture-of-experts, residual-connection, positional encodings, rope, alibi, context window, context extension | skip-connection (optional synonym; residual-connection is published) |

Published counts after this bridge: **87** glossary pages, **14** concept-section
pages (including workflow sample), **8** module pages.

### Phase 4 and later — explicitly deferred

Do **not** queue from this bridge:

- Phase 4 localization, locale routing, and translation asset workflow
- Phase 5+ inference, serving, sampling, quantization, KV cache families
- Model, paper, training-regime, and system docs bundles under `src/content/docs`
- Multimodal, omni, safety, evaluation, and hardware long-tail expansion

## Authorized content-family queue (decomposition)

The remaining authorized Phase 3 gap was decomposed into five independently
reviewable vertical slices. Each slice required canonical page bundles, registry
records, search coverage, related-doc behavior, and family-level tests.

| Order | Family | Story | Status | Verification |
| --- | --- | --- | --- | --- |
| 1 | Architecture and sequence families | 003 | Landed | `phase-3-architecture-sequence-family.test.ts` |
| 2 | Attention-interaction concepts | 004 | Landed | `phase-3-attention-interaction.test.ts` |
| 3 | Normalization and activation variants | 005 | Landed | `phase-3-normalization-activation.test.ts` |
| 4 | Positional and context-extension variants | 006 | Landed | `phase-3-positional-context-extension.test.ts` |
| 5 | Tokenizer foundations | 007 | Landed | `phase-3-tokenizer-foundations.test.ts` |

### Next queueable slice after this bridge

The next smallest authorized slice is the **extended attention-module family**
(DeltaNet, local, global, dilated, block-sparse, ring, attention sinks). Queue it
only after confirming no duplicate module pages already exist and after extending
`EXPECTED_ATTENTION_MODULE_URLS` and tag landing tests.

## How planners should use this bridge

1. Read `pages-needed-componentized-implementation-plan.json` for machine queue state.
2. Treat `remainingAuthorizedPhase3Gaps` as the only Phase 3 backlog authorized from this bridge.
3. Do not re-queue landed families or Phase 2 foundations as new authoring batches.
4. Do not begin Phase 4 localization until customer authorization updates
   `docs/internal/customer-ask.md`.
5. Generate new pages through `generate:page-bundle` and extend the matching
   family inventory test pattern from stories 003–007.

## Related process docs

- `docs/temp/processes/content-page-generation-workflow-relevant-files.md`
- `docs/temp/processes/phase-2-3-reconciliation-relevant-files.md`

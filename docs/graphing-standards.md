# Graphing Standards

Reviewer-checkable rules for React Flow graphs on canonical docs pages. These standards encode Phase 1 customer feedback on grouped-query-attention graph clarity, interaction, and replication across attention variants.

## Related references

* [documentation-template](./documentation-template.md) — where graphs belong in page structure and how to reference `assetId`
* [quality-documents-standards](./quality-documents-standards.md) — concise teaching tone for captions and alt text
* [writing-standards](./writing-standards.md) — math vs narrative placement (no duplicate graph in math section)
* [docs/internal/customer-ask.md](./internal/customer-ask.md) — GQA graph manual gate items (MHA vs GQA comparison, head counts, zoom/pan, readability)

When this document conflicts with older graph assets or pipeline-style diagrams, follow this document and the customer ask.

## One primary graph per module page

Module pages render **exactly one** React Flow canvas on the published page.

* Place the primary graph in the **How it works** section via `ModuleGraph` (or the converged comparison component that wraps the same canvas).
* Do **not** render a second graph in the math/schema section (`computeSchema` and similar assets belong out of baseline module templates).
* Static export and convergence checks must see a single `data-react-flow-graph="true"` marker outside the math/schema region.

**Pass:** One interactive canvas in How it works; math section has equations only.

**Fail:** Duplicate canvases, or a graph embedded under `id="math-or-compute-schema"` — see GQA convergence reasons in [customer-ask](./internal/customer-ask.md).

## Readable node theme

Graph nodes must be readable on the live page and on GitHub Pages static export.

* Set near-white node backgrounds with dark label text using React Flow theme variables on the graph wrapper:
  * `--xy-node-background-color` → white or near-white (for example `var(--card)`)
  * `--xy-node-color` → dark foreground (for example `var(--card-foreground)`)
* Invert any legacy styling that produced dark nodes with light text on a light page background.
* Keep `data-manual-visibility-evidence` on the wrapper so reviewers can find the graph in HTML; static HTML cannot prove contrast — confirm visually per `factory/docs/phase-1-batch-012-gqa-graph-visibility-manual-check.md` when automated checks are `uncertain`.

**Pass:** Node labels are legible at default zoom in light theme; theme CSS variables present on the wrapper.

**Fail:** Missing theme variables, unreadable contrast, or graph shell without hydrated nodes on static export.

## Zoom and pan (interaction without editing)

Readers must inspect graph structure on desktop and on static GitHub Pages deployment.

* Enable **pan** and **zoom** on the React Flow canvas (`RegistryGraphFlow` and shared wrappers).
* Keep **editing disabled**: no draggable nodes, no new connections, no selectable elements that imply authoring.
* Preserve accessibility:
  * `role="img"` and `aria-label` on the graph wrapper
  * sr-only node label fallbacks for screen readers

**Pass:** Scroll/pinch or drag pans and zooms the viewport; nodes and edges are not editable.

**Fail:** `panOnDrag`, `zoomOnScroll`, or equivalent flags disable interaction.

## Attention-variant comparison pattern

For attention modules (GQA, MQA, MLA, and related variants), the primary graph teaches **what changed relative to multi-head attention (MHA)** — not a full training/inference pipeline.

### Required teaching focus

* Show **query-head count versus KV-head count** at a glance (labels, grouping outlines, or count badges).
* Make the head-sharing change visually obvious (group boxes, shared KV nodes, or equivalent).
* Prefer a **comparison switcher** on one canvas over separate static diagrams per variant.
* Minimize pipeline clutter (avoid long vertical chains of internal projection steps when they do not teach the variant difference).

Directional reference: [Sebastian Raschka — Grouped-Query Attention](https://sebastianraschka.com/faq/docs/grouped-query-attention.html).

### Comparison switcher API

* At minimum, support **MHA** and **GQA** on the same canvas for grouped-query-attention.
* Structure the switcher so additional modes (MQA, MLA) register through graph registry or asset config — not a one-off page fork.
* Only one React Flow instance mounts per page; switching variants updates nodes/edges in place.

**Pass:** Reader toggles MHA/GQA and sees distinct head-count presentation on one canvas.

**Fail:** Static pipeline-only diagram, no variant toggle, or comparison requires reading long prose instead of the graph.

## Graph assets and messages

* Reference graphs by `assetId` in MDX; resolve node labels, edge labels, captions, and alt text from colocated messages.
* Captions state what the graph teaches (for example “Compare query heads to shared KV heads”) — not implementation step lists.
* Model pages may use recursive graph viewers for architecture; module pages follow the single-comparison-graph rule above unless a future standard documents an exception.

## Non-module graphs

Paper and model pages include graphs **only where they teach architecture or contributions**. Do not add React Flow canvases for decoration or duplicate table content.

## Reviewer checklist (graphing)

Before approving a module graph change:

1. Exactly one React Flow canvas, located in How it works.
2. Theme variables on wrapper; manual visual check when convergence is `uncertain`.
3. Zoom and pan work; nodes/edges not editable.
4. For attention variants: MHA vs target variant comparison on one canvas; head counts obvious.
5. Static export route hydrates the graph (including switcher markers when applicable).

Cross-check open GQA graph manual gate rows in [customer-ask](./internal/customer-ask.md) before treating the graph baseline as complete.

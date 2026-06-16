# Graphing Standards

Reviewer-checkable rules for React Flow graphs on canonical docs pages. These
standards define the preferred graph representations for module pages, with a
strong emphasis on choosing the graph that teaches the module's actual change
rather than reusing one generic diagram shape everywhere.

## Related references

* [documentation-template](./documentation-template.md) — where graphs belong in page structure and how to reference `assetId`
* [quality-documents-standards](./quality-documents-standards.md) — concise teaching tone for captions and alt text
* [writing-standards](./writing-standards.md) — math vs narrative placement (no duplicate graph in math section)
* [docs/temp/customer-ask.md](./internal/customer-ask.md) — GQA graph manual gate items (MHA vs GQA comparison, head counts, zoom/pan, readability)

When this document conflicts with older graph assets or pipeline-style diagrams,
follow this document and the customer ask.

## One primary graph per module page

Module pages render **exactly one** React Flow canvas on the published page.

* Place the primary graph in the **How it works** section via `ModuleGraph` (or the converged comparison component that wraps the same canvas).
* Do **not** render a second graph in the math/schema section (`computeSchema` and similar assets belong out of baseline module templates).
* Static export and convergence checks must see a single `data-react-flow-graph="true"` marker outside the math/schema region.

**Pass:** One interactive canvas in How it works; math section has equations only.

**Fail:** Duplicate canvases, or a graph embedded under `id="math-or-compute-schema"` — see GQA convergence reasons in [customer-ask](./internal/customer-ask.md).

## Pick the right graph family

The graph must teach the module's main behavioral change. Do not force all
modules into one shared diagram shape.

### Graph families

Use one of these presentation families:

1. **Head-structure comparison**
   * Teaches how Q/K/V heads, KV sharing, grouping, compression, or cache shape
     change across variants.
   * Best for: MHA, MQA, GQA, MLA, and other head-sharing or KV-structure
     variants.

2. **Attention-over-time comparison**
   * Teaches which prior positions a current query can reach.
   * Best for: sliding-window attention, sparse attention, local attention,
     block-sparse attention, dilated attention, global/local hybrids, attention
     sinks, and similar reach/connectivity variants.

3. **Compute-path comparison**
   * Teaches how the attention computation is re-expressed rather than which
     heads or positions exist.
   * Best for: linear attention, DeltaNet-like recurrent/associative updates,
     kernelized attention, and related compute-mechanism variants.

4. **Block-or-architecture view**
   * Teaches where a module lives in a larger block or model stack.
   * Best for architecture pages, model pages, and pages whose central question
     is placement within a system rather than per-step attention behavior.

If a module's core teaching question is "what tokens can this query reach?",
use an attention-over-time graph even if the module technically still has Q, K,
and V tensors.

### Decision rule

Ask: "What is the smallest visual contrast that makes the module different from
the baseline?"

* If the answer is **head count or KV sharing**, use head-structure comparison.
* If the answer is **reachable time steps or mask pattern**, use
  attention-over-time comparison.
* If the answer is **new recurrence, kernel, or summary update**, use
  compute-path comparison.
* If the answer is **where the component sits in the stack**, use a
  block-or-architecture view.

Avoid diagrams that are technically valid but visually teach the wrong thing.
That failure mode matters more than whether a graph looks "consistent" with
other pages.

## Readable node theme

Graph nodes must be readable on the live page and on GitHub Pages static export.

* Set near-white node backgrounds with dark label text using React Flow theme variables on the graph wrapper:
  * `--xy-background-color` → white or near-white (for example `#ffffff`)
  * `--xy-node-background-color` → white or near-white (for example `#ffffff`)
  * `--xy-node-color` → dark foreground (for example `#111827`)
  * `--xy-node-border-color` → a light outline that keeps white nodes visible on the white graph surface
* Invert any legacy styling that produced dark nodes with light text on a light page background.
* Keep `data-manual-visibility-evidence` on the wrapper so reviewers can find the graph in HTML; static HTML cannot prove contrast — confirm visually per `factory/docs/phase-1-batch-012-gqa-graph-visibility-manual-check.md` when automated checks are `uncertain`.

**Pass:** Node labels are legible at default zoom in light theme; theme CSS variables present on the wrapper.

**Fail:** Missing theme variables, unreadable contrast, or graph shell without hydrated nodes on static export.

## Constrained canvas and fit

Graphs must live inside the same content width as the rest of the article.

* The React Flow canvas should be constrained by the page content column rather
  than imposing its own wide scroll surface.
* Default viewport framing should use `fitView` so the visible content is
  centered inside the canvas on first render.
* Prefer compact node sizing and spacing that remain readable on mobile.
* Horizontal overflow is a fallback, not the default reading mode.

**Pass:** The graph fits within the article width, opens centered on the visible
content, and remains legible on narrow viewports.

**Fail:** The graph expands the article width, starts off-center, or requires
horizontal scrolling for normal reading.

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

For attention modules, the primary graph teaches **what changed relative to
multi-head attention (MHA)**. That does not always mean using the same graph
shape.

### Required teaching focus

For head-structure variants:

* Show **query-head count versus KV-head count** at a glance.
* Make head-sharing or KV compression visually obvious.
* Best examples: MHA, MQA, GQA, MLA.

For attention-over-time variants:

* Show a current query such as `q_t`.
* Show which prior `KV` time steps are reachable.
* Make disallowed or out-of-pattern positions visibly distinct from allowed
  positions.
* Best examples: sliding-window attention, sparse attention.

For compute-path variants:

* Show the intermediate summary/update object that replaces dense all-pairs
  scoring.
* Make the changed compute path obvious without turning the graph into a full
  implementation pipeline.
* Best example: linear attention.

Across all of these:

* Prefer a **comparison switcher** on one canvas over separate static diagrams
  per variant.
* Minimize pipeline clutter when it does not teach the variant difference.

Directional reference: [Sebastian Raschka — Grouped-Query Attention](https://sebastianraschka.com/faq/docs/grouped-query-attention.html).

### Comparison switcher API

* At minimum, support the **baseline MHA view** and the **target variant view**
  on the same canvas.
* Structure the switcher so additional modes register through graph registry or
  asset config — not a one-off page fork.
* Only one React Flow instance mounts per page; switching variants updates
  nodes/edges in place.

**Pass:** Reader toggles baseline vs target variant and sees the key difference
on one canvas.

**Fail:** Static pipeline-only diagram, no variant toggle, or comparison
requires reading long prose instead of the graph.

## Graph assets and messages

* Reference graphs by `assetId` in MDX; resolve node labels, edge labels, captions, and alt text from colocated messages.
* Captions state what the graph teaches (for example “Compare query heads to shared KV heads”) — not implementation step lists.
* Model pages may use recursive graph viewers for architecture; module pages follow the single-comparison-graph rule above unless a future standard documents an exception.

Keep graph records reusable. If two module pages need the same MHA baseline or
the same time-pattern baseline, reuse the same graph record rather than cloning
the graph into every page directory.

## Non-module graphs

Paper and model pages include graphs **only where they teach architecture or contributions**. Do not add React Flow canvases for decoration or duplicate table content.

## Reviewer checklist (graphing)

Before approving a module graph change:

1. Exactly one React Flow canvas, located in How it works.
2. Theme variables on wrapper; manual visual check when convergence is `uncertain`.
3. Canvas width is constrained to the article column; default viewport is centered with `fitView`.
4. Zoom and pan work; nodes/edges not editable.
5. For attention variants: choose the correct graph family for the module, then compare MHA vs target variant on one canvas.
6. Static export route hydrates the graph (including switcher markers when applicable).

Cross-check open GQA graph manual gate rows in [customer-ask](./internal/customer-ask.md) before treating the graph baseline as complete.

## Lessons from prior GQA repair

These graph failures recurred across prior graph repair PRs before this
baseline; do not reintroduce them:

* **Pipeline-only diagrams** — vertical projection chains did not teach the MHA→GQA head-sharing change; use the comparison switcher on one canvas.
* **Disabled zoom/pan** — readers could not inspect node labels on desktop or GitHub Pages; enable pan/zoom and keep editing disabled.
* **Unreadable node theme** — dark nodes with light text on a light page background; apply `--xy-node-background-color` and `--xy-node-color` on the graph wrapper.
* **Duplicate math graph** — `computeSchema` React Flow in math/schema duplicated the teaching graph; one canvas in How it works only.
* **No MHA comparison** — static GQA-only diagrams forced long prose to explain the delta; toggle MHA/GQA with obvious query vs KV head counts.
* **Static export shells** — graph markers in HTML without client hydration on GitHub Pages; verify with `make verify-phase-1-github-pages-convergence` and browser MHA/GQA toggle checks.
* **Wrong graph family** — sliding-window and sparse attention looked like QKV
  head diagrams even though the real teaching goal was time-step reachability;
  use attention-over-time graphs for locality and sparsity variants.

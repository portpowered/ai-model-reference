# Canonical Page Surface Budget Relevant Files

Use this reference when reviewing or authoring routine canonical-page pull
requests. The budget keeps ordinary page work narrow so parallel page lanes
do not collide on shared runtime, helper, and verification surfaces.

## Observable budget categories

The routine canonical-page PR budget classifies changed paths into four
practical buckets. These are the same categories used by
`bun run audit:canonical-page-surface`.

| Category | Observable meaning | Routine page work |
| --- | --- | --- |
| **Page-owned** | One page bundle under `src/content/docs/<section>/<slug>/` (`page.mdx`, `messages/en.json`, `assets.json`, page-local media), the matching primary registry record at `src/content/registry/<kind>/<slug>.json`, and page-specific supporting graph/table/citation records declared by that bundle | Expected default |
| **Supported derived** | Artifacts recreated by supported commands such as `bun run prepare:content-runtime` (for example `src/lib/content/generated/*.generated.ts`) | Regenerate locally; do not commit generated runtime artifacts in the routine review commit unless the work item is explicitly broader |
| **Shared hotspot** | Shared helpers (`src/lib/content`, `src/lib/search`), shared test and verification files (`src/lib/content/*.test.ts`, `src/tests/ci`, `scripts/validate-*.ts`), broad registry or manifest edits beyond the page's primary record, build or tooling files | Avoid in ordinary page work; treat as exception or redirect |
| **Unknown / broader** | Paths outside the owned page scope that do not fit the three lanes above | Requires human review; usually signals a throughput lane rather than routine page generation |

This document stays focused on routine canonical-page behavior. It is not a full
repository inventory.

## Page-owned surfaces (routine default)

For one canonical page, reviewers should expect:

- The page bundle directory and its colocated files
- The matching primary structured registry record for that page
- Page-specific supporting records (graph, table, citation, or paper records
  that exist only to render that same page)
- No unrelated shared-surface churn

## Shared hotspot surfaces (high risk for ordinary page work)

Ordinary page branches should avoid touching:

- **`src/lib/content`** — content runtime helpers, MDX components, generated
  runtime manifests, and colocated content tests
- **Shared test and verification files** — `src/lib/content/*.test.ts`,
  `src/tests/ci`, `src/tests/search`, and `scripts/validate-*.ts`
- **Shared registry or manifest sweeps** — broad edits under
  `src/content/registry/` beyond the page's own primary record
- **Build, search, factory, or repository tooling** — unless the work item is
  explicitly broader than one page

## Current hotspot evidence

Maintained evidence comes from `bun run report:planner-conflict-hotspots`. The
report samples recent commits and ranks collision-prone surfaces by touch count.

In the current snapshot, **shared content runtime and verification surfaces are
hotter than individual authored page bundles**:

- `src/lib/content` under **shared test/verification** often leads the ranked
  surfaces (for example 30+ touches across many paths in a 40-commit sample)
- A single page bundle under `src/content/docs/<section>/<slug>/` typically
  appears with only a handful of touches (often 3–4 per bundle in the same
  sample)
- Generated runtime artifacts under `src/lib/content/generated/` also recur as
  **shared hotspot** churn separate from the authored page bundle

Re-run the hotspot report locally when evidence ages. The audit command reads
the same snapshot contract when classifying branch diffs.

## Three review lanes

| Lane | When it applies | Contributor action |
| --- | --- | --- |
| **Default pass (`keep-routine`)** | Only page-owned paths changed | Open or update the routine page PR; no extra justification |
| **Narrow exception (`declare-exception`)** | One small shared hotspot touch directly required to ship the page | Rerun the audit with `--exception-reason "..."` and repeat the same justification in the PR conversation comment |
| **Split or redirect** | Generated outputs in the review commit (`split-to-page-owned-work`), multiple shared categories, shared test churn, or broad helper/runtime edits (`redirect-to-throughput-prd`) | Remove generated artifacts from the routine commit, split page-owned work from shared changes, or open a dedicated throughput/conflict-reduction PRD lane |

## Local checker

| When | Command |
| --- | --- |
| Classify the current branch diff | `bun run audit:canonical-page-surface -- --page-dir src/content/docs/<section>/<slug>` |
| Classify an explicit path list | `bun run audit:canonical-page-surface -- --page-dir src/content/docs/<section>/<slug> --files <path...>` |
| Refresh maintained hotspot evidence | `bun run report:planner-conflict-hotspots` |
| Declare a visible shared-surface exception | `bun run audit:canonical-page-surface -- --page-dir ... --exception-reason "<why>"` |

## Core implementation and docs

- `src/lib/factory/canonical-page-surface-audit.ts` — branch diff and path-list
  classifier; hotspot category grouping; guidance output
- `src/lib/factory/conflict-hotspot-report.ts` — maintained hotspot snapshot
  contract consumed by the audit
- `scripts/audit-canonical-page-surface.ts` — CLI entrypoint
- `scripts/report-planner-conflict-hotspots.ts` — hotspot evidence report
- [CONTRIBUTING.md — routine canonical-page PR surface budget](../../contributors/CONTRIBUTING.md#routine-canonical-page-pr-surface-budget)
- [content-page-generation-workflow-relevant-files.md](./content-page-generation-workflow-relevant-files.md#page-local-scope-versus-shared-hotspot-redirects)
- [review-standards.md — routine canonical-page surface budget](../../review-standards.md#routine-canonical-page-surface-budget-reviewers)

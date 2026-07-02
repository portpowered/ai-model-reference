# Review standards

All pull requests must conform to the following standards:

1. The PR **must not** commit temporary files like `docs/temp` or other scratch artifacts.
2. The code **must** be the simplest possible code; there must not have been a cleaner way to achieve the same outcome.
3. The code **must** be conformant to the appropriate standards relevant to the change.

For general review conduct, also read
[code review standards](../factory/docs/standards/code-review-standards.md).
For docs content quality, use
[docs writing standards](../factory/docs/standards/docs-writing-standards.md).

## Routine canonical page review

When reviewing ordinary canonical docs page work (page bundles under
`src/content/docs/`, matching registry records, and colocated messages/assets),
use the existing validation gates instead of inventing new review requirements.

### Ordinary bundle relationships covered by `make validate-data`

Scanner-backed **derived published-page validation** runs inside
`make validate-data` through `validateRegistryContent`. For ordinary
content-only published pages, treat these relationships as already proven when
`make validate-data` passes:

- `registryId` resolution and page-kind alignment
- default-locale `messages/en.json`
- frontmatter tags and registry-backed citations
- local `assets.json` message-key wiring
- route metadata and colocated bundle shape

Do **not** request a new per-page test that only re-checks those relationships.
Green `make validate-data` on the PR branch is sufficient evidence for routine
bundle alignment.

Maintainer reference:
[derived page validation relevant files](./internal/processes/derived-page-validation-relevant-files.md).

### Valid exceptions for per-page tests

Request or accept per-page tests only when the page introduces behavior that
derived validation cannot express:

| Exception | Examples |
| --- | --- |
| Special rendering or component contracts | Rendered HTML, `data-page-asset`, graph surface labels |
| Graph or table runtime behavior | `validateColocatedPageBundle` table/graph refs, architecture graph wiring |
| Search or discovery behavior | Representative search queries, tag landing membership, sidebar/browse anchors |
| Page-generation workflow behavior | `validateGeneratedPageBundle`, generator output contracts |
| Focused regression guards | Bugs or edge cases not expressible as derived bundle invariants |

Retained per-page tests should include a file- or describe-level comment
explaining why the coverage is special rather than routine page-bundle
validation.

Reject unnecessary per-page test churn when the proposed test only duplicates
registry alignment, default messages, tags, citations, or local asset checks.

### Evidence commands (use these; do not invent new gates)

Point implementers at existing commands instead of asking for manual scans of
route inventories, docs link topology, generated artifacts, or asset-bundle
internals unless that structure is the behavior under review.

| When | Command |
| --- | --- |
| Ordinary page bundle or registry record edits | `make validate-data` |
| Internal docs links after content shape is stable | `make linkcheck` |
| Changes to the derived contract module or its fixtures | `bun test src/lib/content/validate-derived-published-page-bundles.test.ts` |
| Pre-PR full gate (includes derived coverage via `validate-data`) | `make ci` |
| Narrow content-branch proof before review | `bun run doctor:content-pr` |
| Routine canonical-page surface budget | `bun run audit:canonical-page-surface` |
| One narrow generated-runtime proof | `make verify-content-runtime-completeness` |

`make validate-data` is the primary evidence for ordinary page bundles. Prefer
it over new shared per-page tests or ad hoc meta checks.

Do **not** add review requirements that scan source files for route inventories,
validate docs link topology, inspect asset bundle internals, or enforce command
or registration inventories unless those surfaces are the product behavior
under test.

### Drop accidental `next-env.d.ts` drift

For ordinary canonical page PRs (page bundles under `src/content/docs/`,
matching registry records, colocated messages, and page-local assets), **check
the diff for root `next-env.d.ts` changes**. Root `next-env.d.ts` is a
generated Next.js/TypeScript framework declaration file that local dev, build,
or typecheck tooling rewrites. When it appears in a routine page PR and is
**unrelated to page behavior**, ask the author to remove it before merge.

This rule targets **conflict reduction for shared generated files**, not a broad
audit of every generated artifact, route inventory, or asset-bundle internal.
Do not invent new source scans or content-doctor requirements to prove drift
absence; rely on the existing evidence commands in the table above (for example
`make validate-data`, `bun run audit:canonical-page-surface`, and
`bun run doctor:content-pr` when validating a narrow content branch).

**Accidental drift:** the PR touches `next-env.d.ts` but the task did not
intentionally change Next.js or TypeScript framework contracts. Reject or
request removal so the branch stays page-local.

**Legitimate exception:** the work item explicitly changes Next.js or
TypeScript framework contracts (for example `tsconfig.json`, Next config, or
App Router type surfaces) and the PR explains why `next-env.d.ts` changed.
Accept the change when that justification is present.

Authors document the matching preflight rule in
[CONTRIBUTING — drop accidental next-env.d.ts drift before review](./contributors/CONTRIBUTING.md#drop-accidental-next-envdts-drift-before-review).
Align feedback with that section instead of inventing stricter local checks.

**Why this matters:** the planner drift watchdog recently flagged a concrete
multi-lane hotspot while `useful-active=4`: both
`activation-concept-current-main-page` and `normalization-concept-page` had
dirty shared-path drift in `next-env.d.ts`. Rejecting unrelated root-file churn
in routine page PRs reduces avoidable merge conflicts across active page lanes.

### Derived page directory lookup

When reviewing code or tests that resolve published page bundle paths, confirm
routine work uses `getDocsPageDir(section, slug)` from
`src/lib/content/content-paths.ts` instead of new page-specific `*_PAGE_DIR`
constants. Maintainer reference:
[content page generation workflow relevant files](./internal/processes/content-page-generation-workflow-relevant-files.md).

### Contributor cross-reference

Authors document the same policies in
[contributing documentation](./contributors/CONTRIBUTING.md#routine-canonical-page-policies),
[derived published-page validation](./contributors/CONTRIBUTING.md#derived-published-page-validation),
and [drop accidental next-env.d.ts drift before review](./contributors/CONTRIBUTING.md#drop-accidental-next-envdts-drift-before-review).
Reviewers should align feedback with those sections rather than introducing
stricter local rules.

When reviewing scope, confirm routine page PRs stayed page-local unless a narrow
shared touch was visible and justified. Reject hidden shared hotspot churn that
should have been redirected to a throughput lane. See
[CONTRIBUTING — routine canonical-page PR surface budget](./contributors/CONTRIBUTING.md#routine-canonical-page-pr-surface-budget).

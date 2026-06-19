# Graph Family Governance Foundation

This document defines the shared governance contract for registry-backed graphs.
It exists so later family-specific PRDs can inherit one cross-family policy
layer without bundling their migrations into the same work item.

## Shared contract

Governed graphs opt in through `graph.governance`. The shared fields are:

* `mode`: the shared governance contract version.
* `family.id`: the graph family identifier.
* `posture.kind`: whether the graph is a baseline or a variant.
* `posture.baselineGraphId` and `posture.comparisonGraphId`: optional shared
  references for baseline and comparison surfaces.
* `narrativeCenter`: the node, edge, region, or contrast that carries the main
  teaching point.
* `framing.direction`: the declared reading direction for renderers, reviewers,
  and later lint rules.
* `title` and `legend`: whether those review surfaces are required, optional, or
  not applicable.
* `semanticTokens`: the allowed semantic token intent for graph surfaces,
  borders, text, emphasis, comparison highlights, muted context, and optional
  destructive states. Shared governance allows only `background`,
  `foreground`, `primary`, `secondary`, `accent`, `border`, `muted`, and
  `destructive`.

## Family extension point

The shared contract keeps cross-family policy separate from family-owned fields.
Later family PRDs may add family-specific metadata under
`graph.governance.familyExtension` without redefining the shared posture,
narrative-center, framing, title, legend, or token allowlist rules.

## Scope boundary

This foundation does not ship attention, model, routing, training, system, or
other family-specific graph rewrites. Those later PRDs inherit this contract
and define their own lint rules, migrations, and visual recipes on top of it.

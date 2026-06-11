# Architectural Checklist Mechanism Status

## Purpose

This artifact records which mechanisms described in
[architectural-checklist.md](../architectural-checklist.md) are present in the
Model Atlas repository, which are only partially enforced, and which remain
missing. It is the durable evidence source for governance passes and for updating
planner-owned checklists from observable facts rather than assumptions.

## Review metadata

| Field | Value |
| --- | --- |
| **Last reviewed (UTC)** | 2026-06-11 |
| **Review scope** | Phase 1 governance pass: map checklist category sections to repository mechanisms, separate operator-owned controls from source-controlled gates, and prepare focused local enforcement for feasible gaps. |
| **Source checklist** | [docs/architectural-checklist.md](../architectural-checklist.md) |
| **Artifact path** | `docs/governance/architectural-checklist-mechanism-status.md` |

## Status values

Every auditable checklist category uses exactly one of these values:

| Status | Meaning |
| --- | --- |
| **implemented** | Repository source, workflows, scripts, tests, or configuration directly enforce or document the mechanism today. Evidence paths and verification commands are listed. |
| **partially implemented** | Some repository mechanisms exist, but the checklist intent is not fully covered. Evidence cites what exists; gaps explain what is still missing. |
| **missing** | No repository mechanism satisfies the checklist category. The entry must not imply the control already exists. |

Do not use other status labels in category entries. Operator-only controls that
cannot be proven from repository source belong in
[Operator and manual requirements](#operator-and-manual-requirements), not as
`implemented`.

## Evidence rule

A category may be marked **implemented** or **partially implemented** only when
reviewers can verify claims from repository evidence:

* committed workflow files, package scripts, Makefile targets, validation scripts,
  tests, configuration, or maintainer docs that describe what the repo actually
  enforces;
* commands that reproduce the check locally or in CI without secrets or external
  dashboards.

Do **not** mark a mechanism **implemented** based on assumed GitHub branch
protection, deployment-provider settings, environment secrets, preview
infrastructure, or production hosting configuration unless direct repository
evidence proves those controls. When proof lives outside git, document the
requirement under operator/manual requirements and describe how maintainers can
attach future evidence without committing secrets.

## Required fields per category

Each auditable checklist category section (including nested sections such as
**Website fundamentals → Operational**) must appear once in
[Category entries](#category-entries) using this field set:

| Field | Required | Description |
| --- | --- | --- |
| **Category** | yes | Exact checklist heading path, e.g. `Website fundamentals > Operational` or `Testing`. |
| **Status** | yes | One of `implemented`, `partially implemented`, or `missing`. |
| **Summary** | yes | One or two sentences on what the repository does today relative to the checklist. |
| **Repository evidence** | yes | Comma-separated or bulleted repo paths (workflows, scripts, tests, config, docs, source modules). Use `none` only for **missing** entries. |
| **Verification commands** | when applicable | At least one reviewer-runnable command when a local mechanism exists, e.g. `bun run typecheck`, `make ci`, `bun test`. Use `n/a` when no local command applies. |
| **Gaps** | when applicable | What the checklist expects but the repository does not yet enforce. Omit or write `none` when status is **implemented**. |
| **Follow-up or operator requirement** | when applicable | Concrete next mechanism (script, test, doc, CI command) or operator/manual action. Omit or write `none` when no follow-up is needed. |

### Entry template

```markdown
### <Category path>

| Field | Value |
| --- | --- |
| **Status** | implemented \| partially implemented \| missing |
| **Summary** | … |
| **Repository evidence** | `path/to/evidence` |
| **Verification commands** | `bun run …` |
| **Gaps** | … |
| **Follow-up or operator requirement** | … |
```

## Auditable category index

The following sections from [architectural-checklist.md](../architectural-checklist.md)
must each receive a [Category entries](#category-entries) record during the
governance pass:

1. Website fundamentals → Operational
2. Testing
3. System structure
4. Component quality
5. Viewports
6. Package structure
7. Pages
8. Accessibility
9. Localization
10. Quality
11. Build systems
12. Website-specific decisions → Technology decisions
13. Website-specific decisions → App Structure Contract
14. Website-specific decisions → Routing Contract
15. Website-specific decisions → Search Components Contract
16. Website-specific decisions → Derived Related Documents And Tags Contract
17. Website-specific decisions → Link Validation Contract
18. Website-specific decisions → Blog Components Contract
19. Website-specific decisions → Documentation features
20. Website-specific decisions → Template Contract
21. Website-specific decisions → PDF Export Contract
22. Website-specific decisions → ML-specific documentation quality
23. Website-specific decisions → Graph and model rendering
24. Website-specific decisions → README
25. Website-specific decisions → Components
26. Website-specific decisions → Content governance
27. Website-specific decisions → Observability and analytics
28. Website-specific decisions → Security and privacy
29. Website-specific decisions → Performance
30. Website-specific decisions → Definition of done

Nested checklist bullets inside a section roll up to the section entry unless a
later governance pass splits them intentionally.

## Operator and manual requirements

Repository source alone cannot prove some controls. Those belong here (or in
per-category **Follow-up or operator requirement** fields) as manual
operator actions:

* GitHub branch protection and required status checks
* GitHub Pages or other hosting provider settings
* Environment secrets and production environment configuration
* Preview deployment infrastructure when not defined in workflow files
* External monitoring, analytics, or security dashboards

Operators may record future evidence by linking workflow run URLs, settings
screenshots stored outside the repo, or maintainer sign-off in PR conversation
comments. Do not commit secrets or credentials to satisfy this artifact.

## Category entries

Category audits are populated in subsequent governance iterations. Each index row
above must gain a filled entry before the pass is complete.

## Reviewer commands

Commands that validate this artifact and general quality gates are added when
focused enforcement and review scripts land in later stories of this governance
pass.

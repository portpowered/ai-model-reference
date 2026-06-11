# Phase 1 batch-012 GQA graph visibility manual check

The batch-012 customer-ask convergence inventory includes
`module.graph-theme-readability` on `/docs/modules/grouped-query-attention`.
Static built HTML can confirm React Flow theme markers (`--xy-node-color`,
`--xy-node-background-color`) are present, but it cannot prove node foreground
and background colors remain readable against the page theme.

When the automated row is `uncertain`, reviewers must confirm graph visibility
manually before treating the module page as fully converged.

## Required manual check

1. Run `make build` and start the production-built app (or use the verifier
   spawned server from `make verify-phase-1-ux`).
2. Open `/docs/modules/grouped-query-attention` in a desktop browser.
3. Scroll to the **How it works** section and confirm the React Flow graph
   renders with readable node labels and node fills in both light and dark
   theme when applicable.
4. Confirm no second graph canvas appears in the math/schema section below.

Record pass/fail in planner convergence notes alongside the verifier exit code.
Treat unreadable node colors or a duplicate math-section graph as a repair
candidate for the next narrow batch.

1. good code reduces state persistence, it attempts to reduce functions as simple referentially transparent functions and maintains state only at the edges whenever possible. 
2. good code reduces logical complexity. it attempts to shrink complex duplication into simplified concepts as the code changes over time. 
3. good code is well tested, it evaluates and conforms to the appropriate shapes across failures, various forms of state, etc.
4. good form leads, it defines acceptable states and precludes non acceptable states from appearing. 
5. good code is obvious, it does not hide things but makes it perfrom without surprise. 

## Shared content path helpers

Routine canonical docs page additions should not add page-specific directory
exports to `src/lib/content/content-paths.ts`. Compute page directories with
`getDocsPageDir(section, slug)` and keep shared roots (`getDocsRoot`,
`getRegistryRoot`, `getMessagesRoot`) and section roots (`getDocsSectionRoot`,
`get*DocsRoot`) for tree-wide or section-wide work. See
[content-page-generation-workflow-relevant-files](./internal/processes/content-page-generation-workflow-relevant-files.md).

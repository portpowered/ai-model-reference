
All pull requests must correspondingly conform to the following standards
1. the pr MUST not commit temproary files like docs/temp, or other files
2. the code MUST be the simplest possible code and there must not have been a cleaner way to achieve the same outcome. 
3. the code MUST be conformant to the appropriate standards relevant to the change. 

## Discovery and navigation test review

When a pull request touches route discovery, sidebar grouping, browse or tag
landing pages, taxonomy pages, search, or published-doc lookup tests, review the
behavior contract—not a frozen whole-site page inventory.

Prefer these coverage patterns:

- **Structural invariants** for stable shape rules (required docs sections,
  subgroup separators, section-local routing contracts).
- **Representative anchors** for reader journeys (one or a few canonical routes
  per behavior class instead of every page in that class).
- **Discovery-contract checks** when multiple surfaces must agree (source
  resolution, tag landing membership, search-document facets, representative
  query ranking).

Request changes when a test adds or restores broad exact page lists,
`.toEqual` on runtime-derived full-section URL arrays, or other inventories
that will force unrelated edits whenever ordinary pages land—unless the list
itself is the intended reader-visible contract (for example a fixed ordered
command list, a deliberately closed proof set, or a small curated navigation
surface where every entry is hand-chosen).

Ask the author to show **focused touched test** evidence and **cheap
validation** results for the changed surface. If broader checks such as
`make ci` were skipped, require a concrete reason in the PR description.

Contributor workflow detail:
[Discovery and navigation test strategy](./contributors/CONTRIBUTING.md#discovery-and-navigation-test-strategy).
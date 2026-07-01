# Factory Batch Input Relevant Files

Use these files when adding or validating planner batch input examples under
`factory/docs/`.

## Canonical example

* `factory/docs/batch-input-example.json` — copyable `FACTORY_REQUEST_BATCH`
  with two independent `idea` items and one `thoughts` loopback blocked by
  top-level `DEPENDS_ON` relations.
* `factory/docs/batch-inputs.md` — human-readable notes for the canonical shape.
* `factory/docs/overview.md` — planner read-first list and dry-run guidance.

## Schema source of truth

Live listener schema and field names come from `you docs batch-inputs`. Use
camelCase fields such as `requestId`, `workTypeName`, `sourceWorkName`, and
`targetWorkName`. Do not use stale aliases such as `workType`, `items`,
`work_type_id`, or `target_state`.

## Validation

Before copying or submitting a batch example:

```sh
you submit batch --dry-run factory/docs/batch-input-example.json
```

CI proves the checked-in example dry-runs in
`src/tests/ci/factory-batch-input-example.test.ts`. Do not run live
`you submit batch factory/docs/batch-input-example.json` for documentation-only
changes.

## Scope guard

Factory batch documentation work should stay isolated to `factory/docs/**` and
focused CI tests. Avoid touching product content or active model-page surfaces
unless a separate story requires it:

* `src/content/docs/**`
* `src/content/registry/**`
* `src/lib/content/content-paths.ts`
* `factory/factory.json`

# Ontology Classification Topology Convergence Plan

This note is the source design for converging contributor authoring,
page-spec validation, and generated registry output on ontology-backed taxonomy.

## Canonical target shape

For modules, concepts, glossary entries, training regimes, and systems, the
canonical taxonomy contract is:

- `primaryClassificationId`
- `secondaryClassificationIds`
- `relationships`

These fields express membership and topology directly. Legacy typed taxonomy
fields remain only as staged compatibility inputs during the migration.

## Staged deprecation states

Use these labels consistently across docs, templates, schemas, generators, and
warnings:

- `Temporarily accepted with warnings`: a legacy field can still be supplied in
  a compatibility input path, but contributors should be told to migrate.
- `Compatibility-only fallback`: a legacy field may still be read or preserved
  for compatibility, but it is not part of the preferred authoring contract.
- `No longer generated`: starter templates and new authoring tools must not
  emit the field for fresh content.

## Field matrix

| Field | Record kinds | Planned deprecation role |
| --- | --- | --- |
| `moduleType` | module | Temporarily accepted with warnings |
| `conceptType` | concept, glossary, training-regime, system | Temporarily accepted with warnings |
| `regimeType` | training-regime | Temporarily accepted with warnings |
| `systemType` | system | Temporarily accepted with warnings |
| `variantGroup` | module, training-regime, system | Compatibility-only fallback |
| `moduleFamily` | module | Compatibility-only fallback |
| `sidebarGrouping` | concept, module, training-regime, system | No longer generated |

## Contributor-facing implications

- New authoring guidance should describe ontology membership and relationships
  as the primary taxonomy path.
- Starter templates should stop telling authors to fill deprecated typed fields
  as the preferred path for new pages.
- Compatibility paths must be explicit. If a legacy field is still accepted,
  the authoring surface should label that as transitional rather than normal.

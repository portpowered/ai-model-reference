# AI domain barrel — relevant files

## Namespace entry points

- `src/features/ai/index.ts` — server-safe helpers via `export * from "./server"`; renderer namespaces via `models`, `topology`, and `timeline` subpath exports.
- `src/features/ai/server.ts` — SSR-safe re-exports (query helpers, server components, theme/math constants) without client-only graph renderers.
- `src/features/ai/models.ts` — model/module/paper/training/system renderers and helpers from `src/features/models/components`.
- `src/features/ai/topology.ts` — topology helpers and renderers from `src/features/topology`.
- `src/features/ai/timeline.ts` — timeline helpers and renderers from `src/features/docs/timeline`.

## Source domains (transitional direct imports still valid)

- `src/features/models/components/` — MDX-facing AI page renderers; `index.ts` re-exports the public renderer surface.
- `src/features/topology/` — topology browse/prototype graph surface; `index.ts` re-exports helpers and renderers.
- `src/features/docs/timeline/` — ontology timeline page surface; `index.ts` re-exports helpers and renderers.

## Shell consumers to migrate incrementally

- `src/app/(site)/site-renderers.tsx` — imports topology and timeline renderers directly today.
- `src/lib/content/mdx-components.tsx` — imports model renderers directly today.

## Conventions

- Import `@/features/ai` when shell or server code needs helpers without pulling client graph bundles into module evaluation.
- Import `@/features/ai/models`, `@/features/ai/topology`, or `@/features/ai/timeline` when wiring renderers through the AI domain boundary.
- Keep original feature paths working as transitional re-exports until migration stories complete.

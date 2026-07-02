/**
 * Surface selection for the diffusion generation-evolution blog visual.
 *
 * Evaluated existing surfaces:
 * - `OntologyChronoTimeline` — rejected: requires registry-backed ontology items
 *   with release dates, classifications, and doc links rather than a fixed
 *   four-stage conceptual progression.
 * - `GraphFrame` / `LineGraph` — rejected: chart axes and series model quantitative
 *   comparisons, not staged architecture evolution.
 *
 * The smallest fitting surface is a focused horizontal stage timeline component
 * scoped to this comparison.
 */
export const GENERATION_EVOLUTION_SURFACE =
  "generation-evolution-timeline" as const;

export type GenerationEvolutionSurface = typeof GENERATION_EVOLUTION_SURFACE;

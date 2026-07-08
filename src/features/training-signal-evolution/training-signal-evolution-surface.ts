/**
 * Surface selection for the LLM training-signal evolution blog timeline.
 *
 * Evaluated existing surfaces:
 * - `OntologyChronoTimeline` — rejected: requires registry-backed ontology items
 *   with release dates rather than a fixed conceptual training progression.
 * - `TrainingSignalStackedChart` — deferred: quantitative band comparison is
 *   embedded in a later blog section; this surface carries staged prose.
 *
 * The smallest fitting surface is a focused stage timeline component scoped to
 * this training-signal narrative.
 */
export const TRAINING_SIGNAL_EVOLUTION_SURFACE =
  "training-signal-evolution-timeline" as const;

export type TrainingSignalEvolutionSurface =
  typeof TRAINING_SIGNAL_EVOLUTION_SURFACE;

/** Reviewer-verifiable marker that phase meaning is carried by labels, not color alone. */
export const TRAINING_SIGNAL_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE =
  "training-signal-evolution-phase-labels" as const;

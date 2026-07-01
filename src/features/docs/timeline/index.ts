/**
 * Transitional barrel for timeline helpers and renderers.
 * Direct file imports (e.g. `@/features/docs/timeline/OntologyTimelinePage`) remain valid.
 * Prefer `@/features/ai/timeline` for new shell-facing code.
 */

export { OntologyChronoTimeline } from "./OntologyChronoTimeline";
export { OntologyTimelineClientPage } from "./OntologyTimelineClientPage";
export {
  loadPreloadedTimelineSelections,
  OntologyTimelinePage,
} from "./OntologyTimelinePage";
export { OntologyTimelineView } from "./OntologyTimelineView";
export { TimelineClassificationChips } from "./TimelineClassificationChips";

export {
  buildTimelineClassificationHref,
  getCanonicalTimelineSelectorForOutput,
  getDefaultTimelineClassificationSelector,
  normalizeTimelineClassificationSelector,
  TIMELINE_CLASSIFICATION_QUERY_KEY,
} from "./timeline-query";

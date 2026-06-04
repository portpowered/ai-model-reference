/**
 * Backward-compatible re-exports for the reusable component coverage manifest.
 * Prefer importing from `@/lib/docs/component-manifest`.
 */
export type {
  ComponentCoverageEntry as Phase2ComponentCoverageEntry,
  ThinWrapperEntry as Phase2ThinWrapperEntry,
} from "@/lib/docs/component-manifest";

export {
  REUSABLE_COVERAGE_COMPONENTS as PHASE_2_COVERAGE_COMPONENTS,
  REUSABLE_THIN_WRAPPERS as PHASE_2_THIN_WRAPPERS,
} from "@/lib/docs/component-manifest";

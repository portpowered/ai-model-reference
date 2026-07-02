/**
 * Server-safe AI domain exports for SSR and Node evaluation.
 * Import from `@/features/ai` (this module) when shell code needs helpers
 * without pulling client-only renderers into module evaluation.
 */

export {
  loadPreloadedTimelineSelections,
  OntologyTimelinePage,
} from "@/features/docs/timeline/OntologyTimelinePage";
export {
  buildTimelineClassificationHref,
  getCanonicalTimelineSelectorForOutput,
  getDefaultTimelineClassificationSelector,
  normalizeTimelineClassificationSelector,
  TIMELINE_CLASSIFICATION_QUERY_KEY,
} from "@/features/docs/timeline/timeline-query";
export {
  AtAGlanceCard,
  AtAGlanceDefinitionRow,
  AtAGlanceListSection,
} from "@/features/models/components/AtAGlanceCard";
export { MissingTableRecord } from "@/features/models/components/MissingTableRecord";
export { ModelAtAGlance } from "@/features/models/components/ModelAtAGlance";
export { ModelModuleList } from "@/features/models/components/ModelModuleList";
export { ModelsUsingModule } from "@/features/models/components/ModelsUsingModule";
export { ModelTrainingSummary } from "@/features/models/components/ModelTrainingSummary";
export { ModuleAtAGlance } from "@/features/models/components/ModuleAtAGlance";
export { ModuleMetadataCard } from "@/features/models/components/ModuleMetadataCard";
export {
  MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_GQA_ONLY_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS,
  MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MQA_MATH_VARIABLE_DEFINITION_IDS,
  type ModuleAttentionMathSchemaId,
  moduleAttentionMathVariableDefinitionIdsForSchema,
} from "@/features/models/components/module-attention-math-variable-definitions";
export { PaperAtAGlance } from "@/features/models/components/PaperAtAGlance";
export {
  buildRegistryGraphFlowNodeThemeStyle,
  REGISTRY_GRAPH_FLOW_INTERACTION,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS,
  REGISTRY_GRAPH_FLOW_NODE_THEME,
} from "@/features/models/components/registry-graph-flow-theme";
export { SystemAtAGlance } from "@/features/models/components/SystemAtAGlance";
export { TrainingRegimeAtAGlance } from "@/features/models/components/TrainingRegimeAtAGlance";
export type {
  TopologyDocsPageContent,
  TopologyDocsPageContentByRegistryId,
} from "@/features/topology/topology-content";
export {
  buildTopologyGraph,
  getDefaultTopologyClassificationSelectors,
  resolveTopologyClassificationId,
  type TopologyClassificationSelection,
  type TopologyEdge,
  type TopologyGraph,
  type TopologyGraphResult,
  type TopologyNode,
} from "@/features/topology/topology-data";
export {
  buildTopologyHref,
  getCanonicalTopologySelectorsForOutput,
  getDefaultTopologySelectors,
  parseTopologyQuery,
  TOPOLOGY_CLASSIFICATION_QUERY_KEY,
  type TopologyQueryState,
} from "@/features/topology/topology-query";

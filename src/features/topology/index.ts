/**
 * Transitional barrel for topology helpers and renderers.
 * Direct file imports (e.g. `@/features/topology/TopologyPrototype`) remain valid.
 * Prefer `@/features/ai/topology` for new shell-facing code.
 */

export { TopologyCytoscapeGraph } from "./TopologyCytoscapeGraph";
export { TopologyPrototype } from "./TopologyPrototype";

export type {
  TopologyDocsPageContent,
  TopologyDocsPageContentByRegistryId,
} from "./topology-content";

export {
  buildTopologyGraph,
  getDefaultTopologyClassificationSelectors,
  resolveTopologyClassificationId,
  type TopologyClassificationSelection,
  type TopologyEdge,
  type TopologyGraph,
  type TopologyGraphResult,
  type TopologyNode,
} from "./topology-data";

export {
  buildTopologyHref,
  getCanonicalTopologySelectorsForOutput,
  getDefaultTopologySelectors,
  parseTopologyQuery,
  TOPOLOGY_CLASSIFICATION_QUERY_KEY,
  type TopologyQueryState,
} from "./topology-query";

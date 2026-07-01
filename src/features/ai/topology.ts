/**
 * AI domain topology page helpers and renderers.
 */

export { TopologyCytoscapeGraph } from "@/features/topology/TopologyCytoscapeGraph";
export { TopologyPrototype } from "@/features/topology/TopologyPrototype";

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

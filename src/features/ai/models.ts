/**
 * AI domain model, module, paper, training, and system renderers/helpers.
 */

export {
  ActivationFunctionChart,
  isActivationChartId,
} from "@/features/models/components/ActivationFunctionChart";
export {
  AtAGlanceCard,
  AtAGlanceDefinitionRow,
  AtAGlanceListSection,
} from "@/features/models/components/AtAGlanceCard";
export {
  AttentionVariantComparisonGraph,
  type AttentionVariantGraphVariant,
} from "@/features/models/components/AttentionVariantComparisonGraph";
export { ConceptMap } from "@/features/models/components/ConceptMap";
export { MissingTableRecord } from "@/features/models/components/MissingTableRecord";
export { ModelArchitectureGraph } from "@/features/models/components/ModelArchitectureGraph";
export { ModelAtAGlance } from "@/features/models/components/ModelAtAGlance";
export { ModelModuleList } from "@/features/models/components/ModelModuleList";
export { ModelsUsingModule } from "@/features/models/components/ModelsUsingModule";
export { ModelTrainingSummary } from "@/features/models/components/ModelTrainingSummary";
export { ModuleAtAGlance } from "@/features/models/components/ModuleAtAGlance";
export {
  ModuleAttentionMhaMqaSchemaComparison,
  ModuleAttentionSchema,
  ModuleAttentionSchemaComparison,
  ModuleAttentionSchemaComparisonSchemas,
} from "@/features/models/components/ModuleAttentionSchemaComparison";
export { ModuleChart } from "@/features/models/components/ModuleChart";
export { ModuleComparisonTable } from "@/features/models/components/ModuleComparisonTable";
export { ModuleGraph } from "@/features/models/components/ModuleGraph";
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
export { PaperContributionGraph } from "@/features/models/components/PaperContributionGraph";
export { RegistryComparisonTable } from "@/features/models/components/RegistryComparisonTable";
export {
  AnnotationNode,
  ArchitectureBlockNode,
  CanonicalReferenceNode,
  FallbackNode,
  GraphNodeLabel,
  InteractiveDependencyEdge,
  nodeVisualRoleHasHandles,
  OperatorNode,
  RegistryGraphFlow,
  RegistryGraphFlowCanvas,
  RegistryGraphFlowEdgeInteractionContext,
  RegistryGraphFlowEdgePopup,
  RegistryGraphFlowInteractionContext,
  RegistryGraphFlowNodePopup,
  StructuralNode,
} from "@/features/models/components/RegistryGraphFlow";
export {
  buildRegistryGraphFlowNodeThemeStyle,
  REGISTRY_GRAPH_FLOW_INTERACTION,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS,
  REGISTRY_GRAPH_FLOW_NODE_THEME,
} from "@/features/models/components/registry-graph-flow-theme";
export { SystemAtAGlance } from "@/features/models/components/SystemAtAGlance";
export { SystemFlowGraph } from "@/features/models/components/SystemFlowGraph";
export { TrainingRegimeAtAGlance } from "@/features/models/components/TrainingRegimeAtAGlance";
export { TrainingRegimeFlow } from "@/features/models/components/TrainingRegimeFlow";

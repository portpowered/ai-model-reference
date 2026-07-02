/**
 * Transitional barrel for model/module/paper/training/system renderers.
 * Direct file imports (e.g. `@/features/models/components/ModelAtAGlance`) remain valid.
 * Prefer `@/features/ai/models` for new shell-facing code.
 */

export {
  ActivationFunctionChart,
  isActivationChartId,
} from "./ActivationFunctionChart";
export {
  AtAGlanceCard,
  AtAGlanceDefinitionRow,
  AtAGlanceListSection,
} from "./AtAGlanceCard";
export {
  AttentionVariantComparisonGraph,
  type AttentionVariantGraphVariant,
} from "./AttentionVariantComparisonGraph";
export { ConceptMap } from "./ConceptMap";
export { MissingTableRecord } from "./MissingTableRecord";
export { ModelArchitectureGraph } from "./ModelArchitectureGraph";
export { ModelAtAGlance } from "./ModelAtAGlance";
export { ModelModuleList } from "./ModelModuleList";
export { ModelsUsingModule } from "./ModelsUsingModule";
export { ModelTrainingSummary } from "./ModelTrainingSummary";
export { ModuleAtAGlance } from "./ModuleAtAGlance";
export {
  ModuleAttentionMhaMqaSchemaComparison,
  ModuleAttentionSchema,
  ModuleAttentionSchemaComparison,
  ModuleAttentionSchemaComparisonSchemas,
} from "./ModuleAttentionSchemaComparison";
export { ModuleChart } from "./ModuleChart";
export { ModuleComparisonTable } from "./ModuleComparisonTable";
export { ModuleGraph } from "./ModuleGraph";
export { ModuleMetadataCard } from "./ModuleMetadataCard";
export {
  MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_GQA_ONLY_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MATH_FORBIDDEN_DEFINITION_TERMS,
  MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MQA_MATH_VARIABLE_DEFINITION_IDS,
  type ModuleAttentionMathSchemaId,
  moduleAttentionMathVariableDefinitionIdsForSchema,
} from "./module-attention-math-variable-definitions";
export { PaperAtAGlance } from "./PaperAtAGlance";
export { PaperContributionGraph } from "./PaperContributionGraph";
export { RegistryComparisonTable } from "./RegistryComparisonTable";
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
} from "./RegistryGraphFlow";
export {
  isRooflineChartId,
  RooflineTeachingChart,
} from "./RooflineTeachingChart";
export {
  buildRegistryGraphFlowNodeThemeStyle,
  REGISTRY_GRAPH_FLOW_INTERACTION,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS,
  REGISTRY_GRAPH_FLOW_NODE_THEME,
} from "./registry-graph-flow-theme";
export { SystemAtAGlance } from "./SystemAtAGlance";
export { SystemFlowGraph } from "./SystemFlowGraph";
export { TrainingRegimeAtAGlance } from "./TrainingRegimeAtAGlance";
export { TrainingRegimeFlow } from "./TrainingRegimeFlow";

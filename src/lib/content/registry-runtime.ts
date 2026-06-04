import activationConcept from "@/content/registry/concepts/activation.json";
import architectureConcept from "@/content/registry/concepts/architecture.json";
import backpropagationConcept from "@/content/registry/concepts/backpropagation.json";
import componentConcept from "@/content/registry/concepts/component.json";
import computationalGraphConcept from "@/content/registry/concepts/computational-graph.json";
import diffusionModelConcept from "@/content/registry/concepts/diffusion-model.json";
import discriminativeModelConcept from "@/content/registry/concepts/discriminative-model.json";
import embeddingConcept from "@/content/registry/concepts/embedding.json";
import entropyConcept from "@/content/registry/concepts/entropy.json";
import foundationModelConcept from "@/content/registry/concepts/foundation-model.json";
import generativeModelConcept from "@/content/registry/concepts/generative-model.json";
import gradientConcept from "@/content/registry/concepts/gradient.json";
import logitConcept from "@/content/registry/concepts/logit.json";
import lossFunctionConcept from "@/content/registry/concepts/loss-function.json";
import modalityConcept from "@/content/registry/concepts/modality.json";
import modelConcept from "@/content/registry/concepts/model.json";
import moduleConcept from "@/content/registry/concepts/module.json";
import multimodalModelConcept from "@/content/registry/concepts/multimodal-model.json";
import optimizerStateConcept from "@/content/registry/concepts/optimizer-state.json";
import parameterConcept from "@/content/registry/concepts/parameter.json";
import representationConcept from "@/content/registry/concepts/representation.json";
import softmaxConcept from "@/content/registry/concepts/softmax.json";
import temperatureConcept from "@/content/registry/concepts/temperature.json";
import tensorConcept from "@/content/registry/concepts/tensor.json";
import tokenConcept from "@/content/registry/concepts/token.json";
import transformerConcept from "@/content/registry/concepts/transformer.json";
import worldModelConcept from "@/content/registry/concepts/world-model.json";
import groupedQueryAttention from "@/content/registry/modules/grouped-query-attention.json";
import multiHeadAttention from "@/content/registry/modules/multi-head-attention.json";
import multiQueryAttention from "@/content/registry/modules/multi-query-attention.json";
import {
  PUBLISHED_DOCS_REGISTRY_IDS,
  type PublishedDocsRegistryIds,
} from "@/lib/content/published-docs-registry-ids";
import type { RelatedRegistryRecord } from "@/lib/content/related-docs";
import {
  type ConceptRecord,
  conceptRecordSchema,
  type ModuleRecord,
  moduleRecordSchema,
} from "@/lib/content/schemas";

const moduleRecords: ModuleRecord[] = [
  moduleRecordSchema.parse(groupedQueryAttention),
  moduleRecordSchema.parse(multiQueryAttention),
  moduleRecordSchema.parse(multiHeadAttention),
];

const conceptRecords: ConceptRecord[] = [
  conceptRecordSchema.parse(tokenConcept),
  conceptRecordSchema.parse(embeddingConcept),
  conceptRecordSchema.parse(tensorConcept),
  conceptRecordSchema.parse(logitConcept),
  conceptRecordSchema.parse(softmaxConcept),
  conceptRecordSchema.parse(entropyConcept),
  conceptRecordSchema.parse(temperatureConcept),
  conceptRecordSchema.parse(parameterConcept),
  conceptRecordSchema.parse(activationConcept),
  conceptRecordSchema.parse(computationalGraphConcept),
  conceptRecordSchema.parse(gradientConcept),
  conceptRecordSchema.parse(backpropagationConcept),
  conceptRecordSchema.parse(lossFunctionConcept),
  conceptRecordSchema.parse(optimizerStateConcept),
  conceptRecordSchema.parse(modelConcept),
  conceptRecordSchema.parse(architectureConcept),
  conceptRecordSchema.parse(moduleConcept),
  conceptRecordSchema.parse(componentConcept),
  conceptRecordSchema.parse(modalityConcept),
  conceptRecordSchema.parse(foundationModelConcept),
  conceptRecordSchema.parse(generativeModelConcept),
  conceptRecordSchema.parse(discriminativeModelConcept),
  conceptRecordSchema.parse(representationConcept),
  conceptRecordSchema.parse(transformerConcept),
  conceptRecordSchema.parse(diffusionModelConcept),
  conceptRecordSchema.parse(multimodalModelConcept),
  conceptRecordSchema.parse(worldModelConcept),
];

const modulesById = new Map(moduleRecords.map((record) => [record.id, record]));
const conceptsById = new Map(
  conceptRecords.map((record) => [record.id, record]),
);

type TaggedRegistryRecord = ModuleRecord | ConceptRecord;

function getTaggedRecordById(
  registryId: string,
): TaggedRegistryRecord | undefined {
  return modulesById.get(registryId) ?? conceptsById.get(registryId);
}

/** Synchronous module lookup for client MDX components and tests. */
export function getModuleById(registryId: string): ModuleRecord | undefined {
  return modulesById.get(registryId);
}

/** Synchronous concept lookup for client MDX components and tests. */
export function getConceptById(registryId: string): ConceptRecord | undefined {
  return conceptsById.get(registryId);
}

export function listModuleRecords(): ModuleRecord[] {
  return [...moduleRecords];
}

export function listConceptRecords(): ConceptRecord[] {
  return [...conceptRecords];
}

/** Module and concept records used for derived related-document groups. */
export function listRelatedRegistryRecords(): RelatedRegistryRecord[] {
  return [...moduleRecords, ...conceptRecords];
}

/** Synchronous registry lookup for modules and concepts. */
export function getRegistryRecordById(
  registryId: string,
): RelatedRegistryRecord | undefined {
  return getTaggedRecordById(registryId);
}

/** Registry ids with a published docs page (used to avoid broken related links). */
export function getPublishedDocsRegistryIds(): PublishedDocsRegistryIds {
  return PUBLISHED_DOCS_REGISTRY_IDS;
}

/** Tags declared on a registry record, when the record exists. */
export function getRegistryTags(registryId: string): string[] | undefined {
  return getTaggedRecordById(registryId)?.tags;
}

/** Citation IDs declared on a registry record, when the record exists. */
export function getRegistryCitationIds(
  registryId: string,
): string[] | undefined {
  return getTaggedRecordById(registryId)?.citationIds;
}

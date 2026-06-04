import architectureConcept from "@/content/registry/concepts/architecture.json";
import autoregressiveGenerationConcept from "@/content/registry/concepts/autoregressive-generation.json";
import componentConcept from "@/content/registry/concepts/component.json";
import decoderConcept from "@/content/registry/concepts/decoder.json";
import denoisingGenerationConcept from "@/content/registry/concepts/denoising-generation.json";
import diffusionModelConcept from "@/content/registry/concepts/diffusion-model.json";
import discriminativeModelConcept from "@/content/registry/concepts/discriminative-model.json";
import encoderConcept from "@/content/registry/concepts/encoder.json";
import encoderDecoderConcept from "@/content/registry/concepts/encoder-decoder.json";
import foundationModelConcept from "@/content/registry/concepts/foundation-model.json";
import generativeModelConcept from "@/content/registry/concepts/generative-model.json";
import latentConcept from "@/content/registry/concepts/latent.json";
import latentSpaceConcept from "@/content/registry/concepts/latent-space.json";
import modalityConcept from "@/content/registry/concepts/modality.json";
import modelConcept from "@/content/registry/concepts/model.json";
import moduleConcept from "@/content/registry/concepts/module.json";
import multimodalModelConcept from "@/content/registry/concepts/multimodal-model.json";
import patchConcept from "@/content/registry/concepts/patch.json";
import representationConcept from "@/content/registry/concepts/representation.json";
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
  conceptRecordSchema.parse(modelConcept),
  conceptRecordSchema.parse(architectureConcept),
  conceptRecordSchema.parse(moduleConcept),
  conceptRecordSchema.parse(componentConcept),
  conceptRecordSchema.parse(modalityConcept),
  conceptRecordSchema.parse(foundationModelConcept),
  conceptRecordSchema.parse(generativeModelConcept),
  conceptRecordSchema.parse(discriminativeModelConcept),
  conceptRecordSchema.parse(representationConcept),
  conceptRecordSchema.parse(patchConcept),
  conceptRecordSchema.parse(latentConcept),
  conceptRecordSchema.parse(latentSpaceConcept),
  conceptRecordSchema.parse(encoderConcept),
  conceptRecordSchema.parse(decoderConcept),
  conceptRecordSchema.parse(encoderDecoderConcept),
  conceptRecordSchema.parse(autoregressiveGenerationConcept),
  conceptRecordSchema.parse(denoisingGenerationConcept),
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

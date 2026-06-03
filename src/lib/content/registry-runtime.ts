import tokenConcept from "@/content/registry/concepts/token.json";
import groupedQueryAttention from "@/content/registry/modules/grouped-query-attention.json";
import multiHeadAttention from "@/content/registry/modules/multi-head-attention.json";
import multiQueryAttention from "@/content/registry/modules/multi-query-attention.json";
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

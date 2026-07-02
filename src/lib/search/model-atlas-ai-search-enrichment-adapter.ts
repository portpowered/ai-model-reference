import type { RegistryIndexes, RegistryRecord } from "@/lib/content/registry";
import type { ModelRecord, ModuleRecord } from "@/lib/content/schemas";
import type { SearchDocument, SearchDocumentFacets } from "./types";

export type SearchDocumentEnrichmentAdapter = (
  document: SearchDocument,
  indexes: RegistryIndexes,
) => SearchDocument;

function isModelRecord(record: RegistryRecord): record is ModelRecord {
  return record.kind === "model";
}

function isModuleRecord(record: RegistryRecord): record is ModuleRecord {
  return record.kind === "module";
}

function resolveRegistryRecord(
  indexes: RegistryIndexes,
  registryId: string | undefined,
): RegistryRecord | undefined {
  if (!registryId) {
    return undefined;
  }
  return indexes.byId.get(registryId);
}

function buildModelAtlasAiFacets(
  registryRecord: RegistryRecord,
): Partial<SearchDocumentFacets> {
  if (isModelRecord(registryRecord)) {
    return {
      modelFamily: registryRecord.family,
      sourceType: registryRecord.sourceType,
      modalities: registryRecord.modalities,
      trainingRegimeIds: registryRecord.trainingRegimeIds,
    };
  }

  if (isModuleRecord(registryRecord)) {
    return {
      optimizes: registryRecord.optimizes,
    };
  }

  return {};
}

export const enrichSearchDocumentWithModelAtlasAiFacets: SearchDocumentEnrichmentAdapter =
  (document, indexes) => {
    const registryRecord = resolveRegistryRecord(indexes, document.registryId);
    if (!registryRecord) {
      return document;
    }

    const aiFacets = buildModelAtlasAiFacets(registryRecord);
    if (Object.keys(aiFacets).length === 0) {
      return document;
    }

    return {
      ...document,
      facets: {
        ...document.facets,
        ...aiFacets,
      },
    };
  };

export function enrichSearchDocumentsWithModelAtlasAiFacets(
  documents: SearchDocument[],
  indexes: RegistryIndexes,
): SearchDocument[] {
  return documents.map((document) =>
    enrichSearchDocumentWithModelAtlasAiFacets(document, indexes),
  );
}

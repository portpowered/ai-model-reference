import type { RegistryRecord } from "@/lib/content/registry";
import type {
  ConceptRecord,
  ModuleRecord,
  TrainingRegimeRecord,
} from "@/lib/content/schemas";
import type { SearchDocumentFacets, SearchDocumentTopology } from "./types";

const MODULE_TYPE_BY_CLASSIFICATION_ID = new Map<
  string,
  NonNullable<SearchDocumentFacets["moduleType"]>
>([
  ["classification.module.activation", "activation"],
  ["classification.module.attention", "attention"],
  ["classification.module.feed-forward", "feed-forward"],
  ["classification.module.normalization", "normalization"],
  ["classification.module.positional-encoding", "position-encoding"],
  ["classification.module.tokenization", "tokenizer"],
  ["classification.module.transformer-block", "other"],
]);

type LegacySearchTaxonomyCompatibilityFacets = Pick<
  SearchDocumentFacets,
  | "legacyConceptType"
  | "legacyModuleFamily"
  | "legacyVariantGroup"
  | "moduleType"
>;

function isModuleRecord(record: RegistryRecord): record is ModuleRecord {
  return record.kind === "module";
}

function isConceptRecord(record: RegistryRecord): record is ConceptRecord {
  return record.kind === "concept";
}

function isTrainingRegimeRecord(
  record: RegistryRecord,
): record is TrainingRegimeRecord {
  return record.kind === "training-regime";
}

function deriveModuleTypeFromTopology(
  topology: SearchDocumentTopology,
): SearchDocumentFacets["moduleType"] {
  const candidateClassificationIds = [
    topology.primaryClassificationId,
    ...(topology.classificationIds ?? []),
    ...(topology.ancestorClassificationIds ?? []),
    ...(topology.rootClassificationIds ?? []),
  ].filter((classificationId): classificationId is string =>
    Boolean(classificationId),
  );

  for (const classificationId of candidateClassificationIds) {
    const moduleType = MODULE_TYPE_BY_CLASSIFICATION_ID.get(classificationId);
    if (moduleType) {
      return moduleType;
    }
  }

  return undefined;
}

export function resolveLegacySearchTaxonomyCompatibility(
  registryRecord: RegistryRecord | undefined,
  topology: SearchDocumentTopology,
): LegacySearchTaxonomyCompatibilityFacets {
  if (!registryRecord) {
    return {};
  }

  if (isModuleRecord(registryRecord)) {
    return {
      moduleType:
        deriveModuleTypeFromTopology(topology) ?? registryRecord.moduleType,
      legacyModuleFamily: registryRecord.moduleFamily,
      legacyConceptType: registryRecord.conceptType,
      legacyVariantGroup: registryRecord.variantGroup,
    };
  }

  if (isConceptRecord(registryRecord)) {
    return {
      legacyConceptType: registryRecord.conceptType,
    };
  }

  if (isTrainingRegimeRecord(registryRecord)) {
    return {
      legacyConceptType: registryRecord.conceptType,
      legacyVariantGroup: registryRecord.variantGroup,
    };
  }

  return {};
}

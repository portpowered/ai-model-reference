import {
  getClassificationById,
  resolveClassificationId,
} from "./registry-runtime";
import type {
  ModuleRecord,
  SystemRecord,
  TrainingRegimeRecord,
} from "./schemas";

type OntologyMetadataRecord =
  | ModuleRecord
  | TrainingRegimeRecord
  | SystemRecord;

export type OntologyMetadataLabels = {
  primaryLabel?: string;
  secondaryLabels: string[];
};

export function formatMetadataToken(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatClassificationLabel(classificationId: string): string {
  const resolvedClassificationId =
    resolveClassificationId(classificationId) ?? classificationId;
  const classification = getClassificationById(resolvedClassificationId);
  return formatMetadataToken(classification?.slug ?? resolvedClassificationId);
}

function getLegacyPrimaryLabel(
  record: OntologyMetadataRecord,
): string | undefined {
  if (record.kind === "training-regime" && record.regimeType) {
    return formatMetadataToken(record.regimeType);
  }

  if (record.kind === "system" && record.systemType) {
    return formatMetadataToken(record.systemType);
  }

  return undefined;
}

export function deriveOntologyMetadataLabels(
  record: OntologyMetadataRecord,
): OntologyMetadataLabels {
  return {
    primaryLabel: record.primaryClassificationId
      ? formatClassificationLabel(record.primaryClassificationId)
      : getLegacyPrimaryLabel(record),
    secondaryLabels: (record.secondaryClassificationIds ?? []).map(
      formatClassificationLabel,
    ),
  };
}

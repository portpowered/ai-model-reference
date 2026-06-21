import {
  normalizeOntologyClassificationSelector,
  resolveCanonicalOntologyClassificationSelector,
} from "@/lib/content/ontology-classification-selectors";
import { listClassificationRecords } from "@/lib/content/registry-runtime";
import type { ClassificationRecord } from "@/lib/content/schemas";
import { listTopologyNavigationOptions } from "@/lib/content/topology-navigation";

type TimelineCompatibilitySelectorEntry = {
  selector: string;
  classificationId: string;
};

const TIMELINE_COMPATIBILITY_SELECTOR_ENTRIES: readonly TimelineCompatibilitySelectorEntry[] =
  [
    {
      selector: "classification.activation-functions",
      classificationId: "classification.module.activation",
    },
    {
      selector: "classification.attention-mechanisms",
      classificationId: "classification.module.attention",
    },
    {
      selector: "classification.feed-forward-networks",
      classificationId: "classification.module.feed-forward",
    },
    {
      selector: "classification.normalization-layers",
      classificationId: "classification.module.normalization",
    },
    {
      selector: "classification.position-encoding-methods",
      classificationId: "classification.module.positional-encoding",
    },
    {
      selector: "classification.tokenization-methods",
      classificationId: "classification.module.tokenization",
    },
    {
      selector: "classification.transformer-block-structures",
      classificationId: "classification.module.transformer-block",
    },
    {
      selector: "activation",
      classificationId: "classification.module.activation",
    },
    {
      selector: "activation-function",
      classificationId: "classification.module.activation",
    },
    {
      selector: "feed-forward",
      classificationId: "classification.module.feed-forward",
    },
    {
      selector: "feed-forward-network",
      classificationId: "classification.module.feed-forward",
    },
  ];

export function listTimelineCompatibilitySelectorEntries(): readonly TimelineCompatibilitySelectorEntry[] {
  return TIMELINE_COMPATIBILITY_SELECTOR_ENTRIES;
}

export function resolveTimelineCompatibilityClassificationId(
  selector: string,
): string | undefined {
  const normalizedSelector = normalizeOntologyClassificationSelector(selector);

  return TIMELINE_COMPATIBILITY_SELECTOR_ENTRIES.find(
    (entry) =>
      normalizeOntologyClassificationSelector(entry.selector) ===
      normalizedSelector,
  )?.classificationId;
}

export function listTimelineCompatibilitySelectors(
  classification: ClassificationRecord,
): string[] {
  return TIMELINE_COMPATIBILITY_SELECTOR_ENTRIES.filter(
    (entry) => entry.classificationId === classification.id,
  ).map((entry) => normalizeOntologyClassificationSelector(entry.selector));
}

function findCanonicalTimelineOption(classificationId: string) {
  return listTopologyNavigationOptions().find(
    (option) => option.classificationId === classificationId,
  );
}

export function resolveTimelineClassificationSelector(
  selector: string,
  classifications: readonly ClassificationRecord[],
): ClassificationRecord | undefined {
  const canonicalClassification =
    resolveCanonicalOntologyClassificationSelector(selector, classifications);

  if (canonicalClassification) {
    return canonicalClassification;
  }

  const compatibilityClassificationId =
    resolveTimelineCompatibilityClassificationId(selector);
  if (!compatibilityClassificationId) {
    return undefined;
  }

  return classifications.find(
    (classification) => classification.id === compatibilityClassificationId,
  );
}

export function resolveTimelineClassification(
  selector: string,
): ClassificationRecord | undefined {
  return resolveTimelineClassificationSelector(
    selector,
    listClassificationRecords(),
  );
}

export function listSupportedTimelineClassificationSelectors(
  classification: ClassificationRecord,
): string[] {
  return [
    classification.id,
    normalizeOntologyClassificationSelector(classification.slug),
    ...listTimelineCompatibilitySelectors(classification),
  ];
}

export function getCanonicalTimelineSelectorForOutput(
  selector: string,
): string {
  const normalizedSelector = normalizeOntologyClassificationSelector(selector);
  const classification = resolveTimelineClassification(normalizedSelector);

  if (!classification) {
    return normalizedSelector;
  }

  return (
    findCanonicalTimelineOption(classification.id)?.classificationSlug ??
    classification.slug
  );
}

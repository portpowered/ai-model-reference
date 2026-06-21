import { normalizeOntologyClassificationSelector } from "@/lib/content/ontology-classification-selectors";
import { listClassificationRecords } from "@/lib/content/registry-runtime";
import { resolveTimelineClassificationSelector } from "@/lib/content/timeline-selector-compatibility";
import { listTopologyNavigationOptions } from "@/lib/content/topology-navigation";

export const TIMELINE_CLASSIFICATION_QUERY_KEY = "classification";
const DEFAULT_TIMELINE_CLASSIFICATION_ID = "classification.module.activation";

function findCanonicalTimelineOption(classificationId: string) {
  return listTopologyNavigationOptions().find(
    (option) => option.classificationId === classificationId,
  );
}

export function getDefaultTimelineClassificationSelector(): string {
  const defaultOption = findCanonicalTimelineOption(
    DEFAULT_TIMELINE_CLASSIFICATION_ID,
  );
  if (defaultOption) {
    return defaultOption.classificationSlug;
  }

  const fallbackClassification =
    resolveTimelineClassificationSelector(
      DEFAULT_TIMELINE_CLASSIFICATION_ID,
      listClassificationRecords(),
    ) ??
    listClassificationRecords().find(
      (classification) => classification.status === "published",
    );

  return fallbackClassification?.slug ?? "";
}

export function normalizeTimelineClassificationSelector(
  selector: string | null | undefined,
): string {
  const normalizedSelector = selector
    ? normalizeOntologyClassificationSelector(selector)
    : "";

  return normalizedSelector || getDefaultTimelineClassificationSelector();
}

export function getCanonicalTimelineSelectorForOutput(
  selector: string,
): string {
  const normalizedSelector = normalizeOntologyClassificationSelector(selector);
  const classification = resolveTimelineClassificationSelector(
    normalizedSelector,
    listClassificationRecords(),
  );

  if (!classification) {
    return normalizedSelector;
  }

  return (
    findCanonicalTimelineOption(classification.id)?.classificationSlug ??
    classification.slug
  );
}

export function buildTimelineClassificationHref(
  basePath: string,
  selector: string,
): string {
  const searchParams = new URLSearchParams([
    [
      TIMELINE_CLASSIFICATION_QUERY_KEY,
      getCanonicalTimelineSelectorForOutput(selector),
    ],
  ]);

  return `${basePath}?${searchParams.toString()}`;
}

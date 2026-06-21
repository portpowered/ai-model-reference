import type { ClassificationRecord } from "@/lib/content/schemas";

export function normalizeOntologyClassificationSelector(selector: string) {
  return selector.trim().toLowerCase();
}

function resolveCanonicalClassification(
  classifications: readonly ClassificationRecord[],
  normalizedSelector: string,
): ClassificationRecord | undefined {
  return classifications.find(
    (classification) =>
      classification.id === normalizedSelector ||
      classification.slug === normalizedSelector,
  );
}

export function resolveCanonicalOntologyClassificationSelector(
  selector: string,
  classifications: readonly ClassificationRecord[],
): ClassificationRecord | undefined {
  return resolveCanonicalClassification(
    classifications,
    normalizeOntologyClassificationSelector(selector),
  );
}

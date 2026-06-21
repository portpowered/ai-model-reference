import type { ClassificationRecord } from "@/lib/content/schemas";

const TEMPORARY_ONTOLOGY_LEGACY_SELECTOR_ALIASES = new Map<string, string>([
  ["activation", "classification.module.activation"],
  ["activation-function", "classification.module.activation"],
  ["feed-forward", "classification.module.feed-forward"],
  ["feed-forward-network", "classification.module.feed-forward"],
]);

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

function buildCompatibilitySelectorMap(
  classifications: readonly ClassificationRecord[],
): Map<string, string> {
  const selectors = new Map<string, string>();

  for (const classification of classifications) {
    for (const legacyId of classification.legacyIds ?? []) {
      selectors.set(legacyId, classification.id);
    }
  }

  for (const [
    selector,
    classificationId,
  ] of TEMPORARY_ONTOLOGY_LEGACY_SELECTOR_ALIASES) {
    selectors.set(selector, classificationId);
  }

  return selectors;
}

export function listOntologyClassificationCompatibilitySelectors(
  classification: ClassificationRecord,
): string[] {
  const selectors = [...(classification.legacyIds ?? [])];

  for (const [
    selector,
    classificationId,
  ] of TEMPORARY_ONTOLOGY_LEGACY_SELECTOR_ALIASES) {
    if (classificationId === classification.id) {
      selectors.push(selector);
    }
  }

  return [...new Set(selectors.map(normalizeOntologyClassificationSelector))];
}

export function resolveOntologyClassificationSelector(
  selector: string,
  classifications: readonly ClassificationRecord[],
): ClassificationRecord | undefined {
  const canonicalClassification =
    resolveCanonicalOntologyClassificationSelector(selector, classifications);

  if (canonicalClassification) {
    return canonicalClassification;
  }

  const normalizedSelector = normalizeOntologyClassificationSelector(selector);
  const compatibilityClassificationId =
    buildCompatibilitySelectorMap(classifications).get(normalizedSelector);

  if (!compatibilityClassificationId) {
    return undefined;
  }

  return classifications.find(
    (classification) => classification.id === compatibilityClassificationId,
  );
}

export function listSupportedOntologyClassificationSelectors(
  classification: ClassificationRecord,
): string[] {
  const selectors = [
    classification.id,
    classification.slug,
    ...listOntologyClassificationCompatibilitySelectors(classification),
  ];

  return [...new Set(selectors.map(normalizeOntologyClassificationSelector))];
}

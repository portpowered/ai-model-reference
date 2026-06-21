import { expandTopologySearchTerm } from "./topology-search-terms";
import type {
  SearchDocument,
  SearchDocumentTopologyClassification,
} from "./types";

export type SearchClassificationScope = {
  id: string;
  slug: string;
  label: string;
  requested: string;
  terms: string[];
  query: string;
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizedTermVariants(value: string): string[] {
  return unique(expandTopologySearchTerm(value).map(normalizeSearchTerm));
}

function classificationTerms(
  classification: SearchDocumentTopologyClassification,
): string[] {
  return unique([
    classification.id,
    classification.slug,
    classification.label,
    ...classification.aliases,
    ...classification.terms,
  ]);
}

function classificationMatchesRequest(
  requested: string,
  classification: SearchDocumentTopologyClassification,
): boolean {
  const requestedVariants = normalizedTermVariants(requested);
  if (requestedVariants.length === 0) {
    return false;
  }

  const candidateVariants = new Set(
    classificationTerms(classification).flatMap(normalizedTermVariants),
  );
  return requestedVariants.some((variant) => candidateVariants.has(variant));
}

function classificationMatchScore(
  requested: string,
  classification: SearchDocumentTopologyClassification,
): number {
  const normalizedRequested = normalizeSearchTerm(requested);
  const exactTerms = [
    classification.id,
    classification.slug,
    classification.label,
    ...classification.aliases,
  ].map(normalizeSearchTerm);
  if (exactTerms.includes(normalizedRequested)) {
    return 100;
  }

  const expandedTerms = classificationTerms(classification).flatMap(
    normalizedTermVariants,
  );
  if (expandedTerms.includes(normalizedRequested)) {
    return 80;
  }

  return classificationMatchesRequest(requested, classification) ? 60 : 0;
}

function documentClassifications(
  document: SearchDocument,
): SearchDocumentTopologyClassification[] {
  return [
    document.topology.primaryClassification,
    ...document.topology.secondaryClassifications,
  ].filter(
    (classification): classification is SearchDocumentTopologyClassification =>
      classification !== undefined,
  );
}

function toClassificationScope(
  requested: string,
  classification: SearchDocumentTopologyClassification,
): SearchClassificationScope {
  const terms = classificationTerms(classification);
  return {
    id: classification.id,
    slug: classification.slug,
    label: classification.label,
    requested,
    terms,
    query: terms.join(" "),
  };
}

export function resolveSearchClassificationScope(
  requested: string | null | undefined,
  documentsByUrl: Map<string, SearchDocument>,
): SearchClassificationScope | undefined {
  const trimmed = requested?.trim();
  if (!trimmed) {
    return undefined;
  }

  const seen = new Set<string>();
  let bestMatch: SearchDocumentTopologyClassification | undefined;
  let bestScore = 0;
  for (const document of documentsByUrl.values()) {
    for (const classification of documentClassifications(document)) {
      if (seen.has(classification.id)) {
        continue;
      }
      seen.add(classification.id);
      const score = classificationMatchScore(trimmed, classification);
      if (score > bestScore) {
        bestMatch = classification;
        bestScore = score;
        continue;
      }
      if (
        score === bestScore &&
        score > 0 &&
        bestMatch &&
        (classification.id.length < bestMatch.id.length ||
          (classification.id.length === bestMatch.id.length &&
            classification.id.localeCompare(bestMatch.id) < 0))
      ) {
        bestMatch = classification;
      }
    }
  }

  return bestMatch ? toClassificationScope(trimmed, bestMatch) : undefined;
}

export function resolveClassificationSearchQuery(
  query: string,
  classification: string | null | undefined,
  scope: SearchClassificationScope | undefined,
): string {
  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    return trimmedQuery;
  }

  if (scope) {
    return scope.query;
  }

  return classification?.trim() ?? "";
}

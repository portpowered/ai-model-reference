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

function documentClassifications(
  document: SearchDocument,
): SearchDocumentTopologyClassification[] {
  return [
    document.topology.primaryClassification,
    ...document.topology.secondaryClassifications,
    ...(document.topology.ancestorClassifications ?? []),
    ...(document.topology.rootClassifications ?? []),
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
  for (const document of documentsByUrl.values()) {
    for (const classification of documentClassifications(document)) {
      if (seen.has(classification.id)) {
        continue;
      }
      seen.add(classification.id);
      if (classificationMatchesRequest(trimmed, classification)) {
        return toClassificationScope(trimmed, classification);
      }
    }
  }

  return undefined;
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

import type { SortedResult } from "fumadocs-core/search";
import type { SearchClassificationScope } from "./classification-scope";
import { pageBaseUrl } from "./collapse-search-results-to-page-hits";
import { expandTopologySearchTerm } from "./topology-search-terms";
import type { SearchDocument } from "./types";

function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugFromUrl(url: string): string {
  const segment = url.split("/").pop() ?? "";
  return segment.replace(/-/g, " ");
}

function hasExactTagMatch(query: string, document: SearchDocument): boolean {
  const normalizedQuery = normalizeSearchTerm(query);
  return document.tags.some(
    (tag) => normalizeSearchTerm(tag) === normalizedQuery,
  );
}

function normalizedTopologyTermVariants(value: string): string[] {
  return expandTopologySearchTerm(value).map(normalizeSearchTerm);
}

function topologyTermMatchesQuery(query: string, term: string): boolean {
  const queryVariants = normalizedTopologyTermVariants(query);
  const termVariants = normalizedTopologyTermVariants(term);

  return queryVariants.some((queryVariant) => {
    if (queryVariant.length < 3) {
      return termVariants.includes(queryVariant);
    }

    return termVariants.some(
      (termVariant) =>
        termVariant === queryVariant ||
        termVariant.startsWith(queryVariant) ||
        termVariant.includes(` ${queryVariant} `),
    );
  });
}

function topologyTermsMatchQuery(query: string, terms: string[]): boolean {
  return terms.some((term) => topologyTermMatchesQuery(query, term));
}

function topologyRelationshipTerms(document: SearchDocument): string[] {
  return document.topology.relationships.flatMap((relationship) => [
    relationship.relationshipType,
    relationship.targetId,
    relationship.targetSlug ?? "",
    ...relationship.targetAliases,
  ]);
}

function topologyMatchPriority(
  query: string,
  document: SearchDocument | undefined,
): number {
  if (!document || !query.trim()) {
    return 3;
  }

  if (
    document.topology.primaryClassification &&
    topologyTermsMatchQuery(
      query,
      document.topology.primaryClassification.terms,
    )
  ) {
    return 0;
  }

  if (
    document.topology.secondaryClassifications.some((classification) =>
      topologyTermsMatchQuery(query, classification.terms),
    )
  ) {
    return 1;
  }

  if (topologyTermsMatchQuery(query, topologyRelationshipTerms(document))) {
    return 2;
  }

  return 3;
}

function classificationScopePriority(
  scope: SearchClassificationScope | undefined,
  document: SearchDocument | undefined,
): number {
  if (!scope || !document) {
    return 3;
  }

  if (document.topology.primaryClassificationId === scope.id) {
    return 0;
  }

  if (document.topology.secondaryClassificationIds.includes(scope.id)) {
    return 1;
  }

  if (
    topologyTermsMatchQuery(scope.label, document.topology.terms) ||
    topologyTermsMatchQuery(scope.slug, document.topology.terms)
  ) {
    return 2;
  }

  return 3;
}

function scoreDocumentMatch(query: string, document: SearchDocument): number {
  const normalizedQuery = normalizeSearchTerm(query);
  const normalizedTitle = normalizeSearchTerm(document.title);

  if (normalizedTitle === normalizedQuery) {
    return 100;
  }

  for (const alias of document.directAliases) {
    if (normalizeSearchTerm(alias) === normalizedQuery) {
      return 95;
    }
  }

  const normalizedSlug = normalizeSearchTerm(slugFromUrl(document.url));
  if (normalizedSlug === normalizedQuery) {
    return 90;
  }

  return 0;
}

export function findBestTitleMatchPageUrl(
  query: string,
  documentsByUrl: Map<string, SearchDocument>,
): string | undefined {
  let bestUrl: string | undefined;
  let bestScore = 0;

  for (const [url, document] of documentsByUrl) {
    const score = scoreDocumentMatch(query, document);
    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  }

  return bestScore >= 90 ? bestUrl : undefined;
}

function resultPriority(
  query: string,
  scope: SearchClassificationScope | undefined,
  bestPageUrl: string | undefined,
  resultUrl: string,
  document: SearchDocument | undefined,
): number {
  if (resultUrl === bestPageUrl) {
    return 0;
  }

  const scopePriority = classificationScopePriority(scope, document);
  if (scopePriority < 3) {
    return 5 + scopePriority;
  }

  const topologyPriority = topologyMatchPriority(query, document);
  if (topologyPriority < 3) {
    return 10 + topologyPriority;
  }

  if (document && hasExactTagMatch(query, document)) {
    return document.kind === "module" ? 20 : 21;
  }

  return 30;
}

/**
 * Boost exact title, direct-alias, slug, and topology matches so canonical and
 * ontology-near pages rank above incidental body hits.
 */
export function rerankSearchResults(
  query: string,
  results: SortedResult[],
  documentsByUrl: Map<string, SearchDocument>,
  options: { classificationScope?: SearchClassificationScope } = {},
): SortedResult[] {
  const bestPageUrl = findBestTitleMatchPageUrl(query, documentsByUrl);
  const { classificationScope } = options;

  return results
    .map((result, index) => ({ result, index }))
    .sort((left, right) => {
      const leftUrl = pageBaseUrl(left.result.url);
      const rightUrl = pageBaseUrl(right.result.url);
      const leftDocument = documentsByUrl.get(leftUrl);
      const rightDocument = documentsByUrl.get(rightUrl);

      const leftPriority = resultPriority(
        query,
        classificationScope,
        bestPageUrl,
        leftUrl,
        leftDocument,
      );
      const rightPriority = resultPriority(
        query,
        classificationScope,
        bestPageUrl,
        rightUrl,
        rightDocument,
      );

      return leftPriority - rightPriority || left.index - right.index;
    })
    .map(({ result }) => result);
}

import type { OntologyRelationship } from "@/lib/content/schemas";

export type SearchDocumentFacets = {
  kind: string;
  tags: string[];
  modelFamily?: string;
  moduleType?: string;
  optimizes?: string[];
  trainingRegimeIds?: string[];
  modalities?: string[];
  sourceType?: string;
  primaryClassificationId?: string;
  primaryClassificationSlug?: string;
  classificationIds?: string[];
  classificationSlugs?: string[];
  ancestorClassificationIds?: string[];
  ancestorClassificationSlugs?: string[];
  rootClassificationIds?: string[];
  rootClassificationSlugs?: string[];
  relatedTopologyIds?: string[];
  relationshipTypes?: string[];
  legacyModuleFamily?: string;
  legacyConceptType?: string;
  legacyVariantGroup?: string;
};

export type SearchDocumentTopologyClassification = {
  id: string;
  slug: string;
  label: string;
  aliases: string[];
  terms: string[];
};

export type SearchDocumentTopologyRelationship = {
  relationshipType: OntologyRelationship["relationshipType"];
  targetId: string;
  targetKind?: string;
  targetSlug?: string;
  targetAliases: string[];
};

export type SearchDocumentTopology = {
  primaryClassificationId?: string;
  secondaryClassificationIds: string[];
  primaryClassification?: SearchDocumentTopologyClassification;
  secondaryClassifications: SearchDocumentTopologyClassification[];
  classificationIds?: string[];
  ancestorClassificationIds?: string[];
  ancestorClassifications?: SearchDocumentTopologyClassification[];
  rootClassificationIds?: string[];
  rootClassifications?: SearchDocumentTopologyClassification[];
  relationships: SearchDocumentTopologyRelationship[];
  relatedTopologyIds?: string[];
  terms: string[];
};

export type GenericSearchDocumentFacets = Pick<
  SearchDocumentFacets,
  "kind" | "tags"
>;

export const EMPTY_SEARCH_DOCUMENT_TOPOLOGY: SearchDocumentTopology = {
  secondaryClassificationIds: [],
  secondaryClassifications: [],
  classificationIds: [],
  ancestorClassificationIds: [],
  ancestorClassifications: [],
  rootClassificationIds: [],
  rootClassifications: [],
  relationships: [],
  relatedTopologyIds: [],
  terms: [],
};

export type BaseSearchDocument = {
  id: string;
  registryId?: string;
  url: string;
  kind: string;
  title: string;
  description: string;
  publishedAt?: string;
  bodyText: string;
  headings: string[];
  directAliases: string[];
  aliases: string[];
  tags: string[];
  relatedIds: string[];
  facets: GenericSearchDocumentFacets;
  topology: SearchDocumentTopology;
};

export type SearchDocument = {
  id: string;
  registryId?: string;
  url: string;
  kind: string;
  title: string;
  description: string;
  publishedAt?: string;
  bodyText: string;
  headings: string[];
  directAliases: string[];
  aliases: string[];
  tags: string[];
  relatedIds: string[];
  facets: SearchDocumentFacets;
  topology: SearchDocumentTopology;
};

export type FumadocsStructuredData = {
  headings: Array<{ id: string; content: string }>;
  contents: Array<{ heading: string | undefined; content: string }>;
};

export type FumadocsSearchIndexEntry = {
  id: string;
  title: string;
  description: string;
  url: string;
  structuredData: FumadocsStructuredData;
};

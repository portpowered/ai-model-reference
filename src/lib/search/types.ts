export type SearchDocumentFacets = {
  kind: string;
  tags: string[];
  modelFamily?: string;
  moduleType?: string;
  moduleFamily?: string;
  conceptType?: string;
  variantGroup?: string;
  optimizes?: string[];
  trainingRegimeIds?: string[];
  modalities?: string[];
  sourceType?: string;
};

export type SearchDocument = {
  id: string;
  registryId?: string;
  url: string;
  kind: string;
  title: string;
  description: string;
  bodyText: string;
  headings: string[];
  aliases: string[];
  tags: string[];
  relatedIds: string[];
  facets: SearchDocumentFacets;
};

export type FumadocsStructuredData = {
  headings: Array<{ id: string; content: string }>;
  contents: Array<{ heading?: string; content: string }>;
};

export type FumadocsSearchIndexEntry = {
  id: string;
  title: string;
  description: string;
  url: string;
  structuredData: FumadocsStructuredData;
};

import {
  collectMessageBodyText,
  collectMessageHeadings,
} from "@/lib/content/messages";
import type { DocsPageSource } from "@/lib/content/pages";
import type { RegistryStore } from "@/lib/content/registry";
import { getRegistryRecord } from "@/lib/content/registry";
import type {
  ModuleRecord,
  RegistryRecord,
  TagRecord,
} from "@/lib/content/schemas";
import type { SearchDocument, SearchDocumentFacets } from "./types";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function isModuleRecord(record: RegistryRecord): record is ModuleRecord {
  return record.kind === "module";
}

function isTagRecord(record: RegistryRecord): record is TagRecord {
  return record.kind === "tag";
}

function tagSearchTerms(store: RegistryStore, tagSlugs: string[]): string[] {
  const terms: string[] = [];
  for (const slug of tagSlugs) {
    terms.push(slug);
    const record = store.records.find(
      (candidate) => candidate.kind === "tag" && candidate.slug === slug,
    );
    if (record && isTagRecord(record)) {
      terms.push(record.slug, ...record.aliases);
    }
  }
  return unique(terms);
}

function buildFacets(
  pageKind: string,
  tags: string[],
  registryRecord?: RegistryRecord,
): SearchDocumentFacets {
  const facets: SearchDocumentFacets = { kind: pageKind, tags };

  if (registryRecord && isModuleRecord(registryRecord)) {
    facets.moduleType = registryRecord.moduleType;
    facets.moduleFamily = registryRecord.moduleFamily;
    facets.conceptType = registryRecord.conceptType;
    facets.variantGroup = registryRecord.variantGroup;
    facets.optimizes = registryRecord.optimizes;
  }

  return facets;
}

export function buildSearchDocument(
  page: DocsPageSource,
  store: RegistryStore,
): SearchDocument {
  const registryRecord = getRegistryRecord(store, page.frontmatter.registryId);
  const registryAliases = registryRecord?.aliases ?? [];
  const registryTags = registryRecord?.tags ?? [];
  const pageTags = unique([...page.frontmatter.tags, ...registryTags]);
  const tagTerms = tagSearchTerms(store, pageTags);
  const headings = collectMessageHeadings(page.messages);
  const bodyText = collectMessageBodyText(page.messages);
  const aliases = unique([
    ...page.frontmatter.aliases,
    ...registryAliases,
    ...tagTerms,
  ]);

  return {
    id: page.url,
    registryId: page.frontmatter.registryId,
    url: page.url,
    kind: page.frontmatter.kind,
    title: page.messages.title,
    description: page.messages.description,
    bodyText,
    headings,
    aliases,
    tags: pageTags,
    relatedIds: registryRecord?.relatedIds ?? [],
    facets: buildFacets(page.frontmatter.kind, pageTags, registryRecord),
  };
}

export function buildSearchDocuments(
  pages: DocsPageSource[],
  store: RegistryStore,
): SearchDocument[] {
  return pages.map((page) => buildSearchDocument(page, store));
}

export function buildSearchDocumentsForLocale(
  locale: string,
  store: RegistryStore,
  pages: DocsPageSource[],
): SearchDocument[] {
  void locale;
  return buildSearchDocuments(pages, store);
}

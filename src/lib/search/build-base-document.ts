import {
  collectMessageBodyText,
  collectMessageHeadings,
} from "@/lib/content/messages";
import type { DocsPageSource } from "@/lib/content/pages";
import { resolvePublishedResourceTags } from "@/lib/content/phase-1-published-resources";
import type { RegistryIndexes, RegistryRecord } from "@/lib/content/registry";
import type { TagRecord } from "@/lib/content/schemas";
import type { BaseSearchDocument } from "./types";
import { EMPTY_SEARCH_DOCUMENT_TOPOLOGY } from "./types";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function isTagRecord(record: RegistryRecord): record is TagRecord {
  return record.kind === "tag";
}

function getRegistryRecord(
  indexes: RegistryIndexes,
  registryId?: string,
): RegistryRecord | undefined {
  if (!registryId) {
    return undefined;
  }
  return indexes.byId.get(registryId);
}

function citationSearchTerms(
  indexes: RegistryIndexes,
  citationIds: string[],
): string[] {
  const terms: string[] = [];

  for (const citationId of citationIds) {
    const citation = indexes.byId.get(citationId);
    if (citation?.kind === "citation") {
      terms.push(citation.slug, ...citation.aliases);
    }
  }

  return terms;
}

function isCitationIntroducingRecord(
  registryRecord: RegistryRecord,
  citationId: string,
): boolean {
  if ("sourceId" in registryRecord && registryRecord.sourceId === citationId) {
    return true;
  }

  return (
    registryRecord.kind === "paper" &&
    registryRecord.citationIds?.includes(citationId) === true
  );
}

function citationDirectSearchTerms(
  indexes: RegistryIndexes,
  registryRecord: RegistryRecord | undefined,
  citationIds: string[],
): string[] {
  if (!registryRecord) {
    return [];
  }

  return citationSearchTerms(
    indexes,
    citationIds.filter((citationId) =>
      isCitationIntroducingRecord(registryRecord, citationId),
    ),
  );
}

function tagSearchTerms(
  indexes: RegistryIndexes,
  tagSlugs: string[],
): string[] {
  const terms: string[] = [];
  for (const slug of tagSlugs) {
    terms.push(slug);
    const record = indexes.tagsBySlug.get(slug);
    if (record && isTagRecord(record)) {
      terms.push(record.slug, ...record.aliases);
    }
  }
  return unique(terms);
}

export function buildBaseSearchDocument(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): BaseSearchDocument {
  const registryRecord = getRegistryRecord(
    indexes,
    page.frontmatter.registryId,
  );
  const registryAliases = registryRecord?.aliases ?? [];
  const citationIds = registryRecord?.citationIds ?? [];
  const citationTerms = citationSearchTerms(indexes, citationIds);
  const citationDirectTerms = citationDirectSearchTerms(
    indexes,
    registryRecord,
    citationIds,
  );
  const pageTags = resolvePublishedResourceTags(page, indexes);
  const tagTerms = tagSearchTerms(indexes, pageTags);
  const headings = collectMessageHeadings(page.messages);
  const bodyText = collectMessageBodyText(page.messages);
  const directAliases = unique([
    ...(page.frontmatter.aliases ?? []),
    ...registryAliases,
    ...citationDirectTerms,
  ]);
  const aliases = unique([...directAliases, ...tagTerms, ...citationTerms]);

  return {
    id: page.url,
    registryId: page.frontmatter.registryId,
    url: page.url,
    kind: page.frontmatter.kind,
    title: page.messages.title,
    description: page.messages.description,
    bodyText,
    headings,
    directAliases,
    aliases,
    tags: pageTags,
    relatedIds: registryRecord?.relatedIds ?? [],
    facets: {
      kind: page.frontmatter.kind,
      tags: pageTags,
    },
    topology: { ...EMPTY_SEARCH_DOCUMENT_TOPOLOGY },
  };
}

export function buildBaseSearchDocuments(
  pages: DocsPageSource[],
  indexes: RegistryIndexes,
): BaseSearchDocument[] {
  return pages.map((page) => buildBaseSearchDocument(page, indexes));
}

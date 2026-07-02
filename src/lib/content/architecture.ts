import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import type { DocsPageSource } from "./pages";
import { getRegistryRecord, type RegistryIndexes } from "./registry-index";
import { listClassificationAncestors } from "./registry-runtime";
import type { ConceptRecord } from "./schemas";

export type ArchitectureEntry = {
  title: string;
  summary: string;
  url: string;
  slug: string;
};

function isConceptRecord(
  record: ReturnType<typeof getRegistryRecord>,
): record is ConceptRecord {
  return record?.kind === "concept";
}

function isArchitectureConceptRecord(
  record: ReturnType<typeof getRegistryRecord>,
): boolean {
  if (!isConceptRecord(record)) {
    return false;
  }

  if (record.conceptType === "architecture") {
    return true;
  }

  const primaryClassificationId = record.primaryClassificationId;
  if (!primaryClassificationId) {
    return false;
  }

  if (primaryClassificationId === "classification.concept.architecture") {
    return true;
  }

  return listClassificationAncestors(primaryClassificationId).some(
    (classification) =>
      classification.id === "classification.concept.architecture",
  );
}

function isTaxonomyConceptRecord(
  record: ReturnType<typeof getRegistryRecord>,
): boolean {
  return isConceptRecord(record) && record.tags.includes("taxonomy");
}

function isFoundationsArchitectureConceptRecord(
  record: ReturnType<typeof getRegistryRecord>,
): boolean {
  return (
    isConceptRecord(record) &&
    record.tags.includes("foundations") &&
    !record.tags.includes("token-to-probability-chain")
  );
}

export function isArchitectureRelatedPage(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): boolean {
  if (page.docsSlug.startsWith("architecture/")) {
    return true;
  }

  const record = getRegistryRecord(indexes, page.frontmatter.registryId);
  if (isArchitectureConceptRecord(record)) {
    return true;
  }

  if (
    (page.frontmatter.kind === "glossary" ||
      page.frontmatter.kind === "concept") &&
    isFoundationsArchitectureConceptRecord(record)
  ) {
    return true;
  }

  return (
    page.frontmatter.kind === "glossary" && isTaxonomyConceptRecord(record)
  );
}

export function toArchitectureEntry(page: DocsPageSource): ArchitectureEntry {
  return {
    title: page.messages.title,
    summary: page.messages.description,
    url: page.url,
    slug: page.docsSlug,
  };
}

export function sortArchitectureEntriesByTitle(
  entries: ArchitectureEntry[],
  locale: SiteLocale = defaultLocale,
): ArchitectureEntry[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, locale, { sensitivity: "base" }),
  );
}

export async function loadPublishedArchitectureEntries(
  locale: SiteLocale = defaultLocale,
): Promise<ArchitectureEntry[]> {
  const { loadRegistry } = await import("./registry");
  const { loadShippedLocalizedDocsPages } = await import("./pages");
  const indexes = await loadRegistry();
  const pages = (await loadShippedLocalizedDocsPages(locale)).filter((page) =>
    isArchitectureRelatedPage(page, indexes),
  );
  return sortArchitectureEntriesByTitle(pages.map(toArchitectureEntry), locale);
}

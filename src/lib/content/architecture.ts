import type { DocsPageSource } from "./pages";
import { getRegistryRecord, type RegistryIndexes } from "./registry-index";
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
  return isConceptRecord(record) && record.conceptType === "architecture";
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
): ArchitectureEntry[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
  );
}

export async function loadPublishedArchitectureEntries(
  locale = "en",
): Promise<ArchitectureEntry[]> {
  const { loadRegistry } = await import("./registry");
  const { loadPublishedDocsPages } = await import("./pages");
  const indexes = await loadRegistry();
  const pages = (await loadPublishedDocsPages(locale)).filter((page) =>
    isArchitectureRelatedPage(page, indexes),
  );
  return sortArchitectureEntriesByTitle(pages.map(toArchitectureEntry));
}

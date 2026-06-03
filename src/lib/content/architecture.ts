import { type DocsPageSource, loadPublishedDocsPages } from "./pages";
import {
  type RegistryStore,
  getRegistryRecord,
  loadRegistry,
} from "./registry";
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

export function isArchitectureRelatedPage(
  page: DocsPageSource,
  store: RegistryStore,
): boolean {
  if (page.docsSlug.startsWith("architecture/")) {
    return true;
  }

  if (page.frontmatter.kind !== "concept") {
    return false;
  }

  const record = getRegistryRecord(store, page.frontmatter.registryId);
  return isConceptRecord(record) && record.conceptType === "architecture";
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

export function loadPublishedArchitectureEntries(
  locale = "en",
): ArchitectureEntry[] {
  const store = loadRegistry();
  const pages = loadPublishedDocsPages(locale).filter((page) =>
    isArchitectureRelatedPage(page, store),
  );
  return sortArchitectureEntriesByTitle(pages.map(toArchitectureEntry));
}

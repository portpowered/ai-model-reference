import {
  conceptPageHref,
  glossaryPageHref,
  modelPageHref,
  modulePageHref,
  paperPageHref,
  systemPageHref,
  trainingPageHref,
} from "@/lib/content/content-hrefs";
import type { PageKind } from "@/lib/content/schemas";

export const PUBLISHED_DOCS_SECTIONS = [
  "glossary",
  "concepts",
  "modules",
  "models",
  "papers",
  "training",
  "systems",
] as const;

export type PublishedDocsSection = (typeof PUBLISHED_DOCS_SECTIONS)[number];
export type PublishedDocsRegistryIds = ReadonlySet<string>;

export type PublishedDocsEntry = {
  registryId: string;
  slug: string;
  docsSlug: string;
  url: string;
  pageKind: PageKind;
  section: PublishedDocsSection;
};

export type PublishedDocsRecordRef = {
  id: string;
  slug: string;
  kind: string;
};

export function docsSectionFromSlug(docsSlug: string): PublishedDocsSection {
  const [section] = docsSlug.split("/");
  if (!section) {
    throw new Error(`Cannot derive docs section from empty docs slug`);
  }

  if (PUBLISHED_DOCS_SECTIONS.includes(section as PublishedDocsSection)) {
    return section as PublishedDocsSection;
  }

  throw new Error(
    `Unsupported published docs section "${section}" for docs slug "${docsSlug}"`,
  );
}

export function publishedDocsHrefFromEntry(entry: PublishedDocsEntry): string {
  switch (entry.section) {
    case "glossary":
      return glossaryPageHref(entry.slug);
    case "concepts":
      return conceptPageHref(entry.slug);
    case "modules":
      return modulePageHref(entry.slug);
    case "models":
      return modelPageHref(entry.slug);
    case "papers":
      return paperPageHref(entry.slug);
    case "training":
      return trainingPageHref(entry.slug);
    case "systems":
      return systemPageHref(entry.slug);
  }
}

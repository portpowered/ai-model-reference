import { modulePageHref } from "@/lib/content/content-hrefs";
import type { DocsPageSource } from "@/lib/content/pages";
import {
  getRegistryRecord,
  type RegistryIndexes,
} from "@/lib/content/registry-index";

/** Phase 1 attention discovery tag slug shared by tag landing and search. */
export const PHASE_1_ATTENTION_TAG_SLUG = "attention" as const;

/** Canonical grouped-query-attention module URL for Phase 1 discovery checks. */
export const PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL = modulePageHref(
  "grouped-query-attention",
);

function uniqueTagSlugs(tagSlugs: readonly string[]): string[] {
  return [...new Set(tagSlugs.filter(Boolean))];
}

/**
 * Merges published page frontmatter tags with registry record tags.
 * Tag landing and search both derive discoverability from this rule.
 */
export function resolvePublishedResourceTags(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): string[] {
  const registryRecord = getRegistryRecord(
    indexes,
    page.frontmatter.registryId,
  );
  const registryTags = registryRecord?.tags ?? [];
  return uniqueTagSlugs([...page.frontmatter.tags, ...registryTags]);
}

/** True when a published docs page belongs to the given tag slug. */
export function publishedResourceMatchesTag(
  page: DocsPageSource,
  tagSlug: string,
  indexes: RegistryIndexes,
): boolean {
  return resolvePublishedResourceTags(page, indexes).includes(tagSlug);
}

/** Published docs pages discoverable under a tag slug via the canonical Phase 1 rule. */
export async function loadPublishedResourcesForTag(
  tagSlug: string,
  locale = "en",
): Promise<DocsPageSource[]> {
  const { loadRegistry } = await import("./registry");
  const { loadPublishedDocsPages } = await import("./pages");
  const indexes = await loadRegistry();
  const pages = await loadPublishedDocsPages(locale);
  return pages.filter((page) =>
    publishedResourceMatchesTag(page, tagSlug, indexes),
  );
}

/** Module docs URLs for the Phase 1 attention tag, sorted by reader-facing title. */
export async function loadPhase1AttentionModuleUrls(
  locale = "en",
): Promise<string[]> {
  const pages = await loadPublishedResourcesForTag(
    PHASE_1_ATTENTION_TAG_SLUG,
    locale,
  );
  return pages
    .filter((page) => page.frontmatter.kind === "module")
    .sort((a, b) =>
      a.messages.title.localeCompare(b.messages.title, "en", {
        sensitivity: "base",
      }),
    )
    .map((page) => page.url);
}

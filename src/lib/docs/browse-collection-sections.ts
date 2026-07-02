import type { DocsIndexEntry } from "@/features/docs/components/DocsIndexEntryList";
import type { DocsPageSource } from "@/lib/content/pages";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import type { ShellCollectionDefinition } from "@/lib/docs/collection-definition-contract";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import { toDocsIndexEntries } from "@/lib/docs/docs-index-entries";
import { resolveUiMessagePath } from "@/lib/docs/section-collection-index";
import {
  buildLocalizedRoute,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

/** Reader-visible browse section order for the AI docs atlas. */
export const DOCS_BROWSE_COLLECTION_IDS = [
  "models",
  "modules",
  "concepts",
  "papers",
  "training",
  "systems",
  "glossary",
] as const;

export type BrowseCollectionSection = {
  id: string;
  title: string;
  description: string;
  entries: DocsIndexEntry[];
  linkLabel?: string;
  linkHref?: string;
};

export type ShellCollectionPageSource = {
  docsSlug: string;
  url: string;
  messages: { title: string; description: string };
  frontmatter: { kind: string };
};

function defaultResolveBrowseSectionLinkHref(
  definition: Pick<ShellCollectionDefinition, "id" | "routeSlug">,
  locale: SiteLocale,
): string {
  if (definition.id === "glossary") {
    return buildLocalizedRoute({ surface: "glossary-index" }, locale);
  }

  return buildLocalizedRoute(
    { surface: "docs-page", slug: definition.routeSlug },
    locale,
  );
}

export type ShellCollectionBrowseDefinition = Pick<
  ShellCollectionDefinition,
  "id" | "routeSlug" | "frontmatterKind" | "starterSlugs" | "messageKeys"
>;

function buildBrowseCollectionSection(
  definition: ShellCollectionBrowseDefinition,
  pages: readonly ShellCollectionPageSource[],
  locale: SiteLocale,
  messages: Record<string, unknown>,
  resolveSectionLinkHref: (
    definition: ShellCollectionBrowseDefinition,
    locale: SiteLocale,
  ) => string,
): BrowseCollectionSection {
  const collectionPages = pages.filter(
    (page) => page.frontmatter.kind === definition.frontmatterKind,
  );

  return {
    id: definition.id,
    title: resolveUiMessagePath(
      messages,
      definition.messageKeys.browse.sectionTitle,
    ),
    description: resolveUiMessagePath(
      messages,
      definition.messageKeys.browse.sectionDescription,
    ),
    entries: toDocsIndexEntries(collectionPages, locale, [
      ...definition.starterSlugs,
    ]),
    linkLabel: resolveUiMessagePath(
      messages,
      definition.messageKeys.browse.sectionLinkLabel,
    ),
    linkHref: resolveSectionLinkHref(definition, locale),
  };
}

export function buildBrowseCollectionSections({
  pages,
  locale,
  messages,
  definitions = listDocsCollectionDefinitions(),
  browseCollectionIds = DOCS_BROWSE_COLLECTION_IDS,
  resolveSectionLinkHref = defaultResolveBrowseSectionLinkHref,
}: {
  pages: readonly ShellCollectionPageSource[] | readonly DocsPageSource[];
  locale: SiteLocale;
  messages: UiMessages | Record<string, unknown>;
  definitions?: readonly ShellCollectionBrowseDefinition[];
  browseCollectionIds?: readonly string[];
  resolveSectionLinkHref?: (
    definition: ShellCollectionBrowseDefinition,
    locale: SiteLocale,
  ) => string;
}): BrowseCollectionSection[] {
  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );

  return browseCollectionIds.map((id) => {
    const definition = definitionsById.get(id);
    if (!definition) {
      throw new Error(`Missing collection definition for browse id: ${id}`);
    }

    return buildBrowseCollectionSection(
      definition,
      pages,
      locale,
      messages,
      resolveSectionLinkHref,
    );
  });
}

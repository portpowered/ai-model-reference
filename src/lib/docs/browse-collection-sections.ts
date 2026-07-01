import type { DocsIndexEntry } from "@/features/docs/components/DocsIndexEntryList";
import type { DocsPageSource } from "@/lib/content/pages";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import type { DocsCollectionDefinition } from "@/lib/docs/collection-definition-contract";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import { toDocsIndexEntries } from "@/lib/docs/docs-index-entries";
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

function resolveUiMessagePath(messages: UiMessages, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (current, segment) =>
        current !== null &&
        typeof current === "object" &&
        segment in (current as Record<string, unknown>)
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      messages,
    );

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing UI message for path: ${path}`);
  }

  return value;
}

function resolveBrowseSectionLinkHref(
  definition: DocsCollectionDefinition,
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

function buildBrowseCollectionSection(
  definition: DocsCollectionDefinition,
  pages: DocsPageSource[],
  locale: SiteLocale,
  messages: UiMessages,
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
    linkHref: resolveBrowseSectionLinkHref(definition, locale),
  };
}

export function buildBrowseCollectionSections({
  pages,
  locale,
  messages,
  definitions = listDocsCollectionDefinitions(),
}: {
  pages: DocsPageSource[];
  locale: SiteLocale;
  messages: UiMessages;
  definitions?: readonly DocsCollectionDefinition[];
}): BrowseCollectionSection[] {
  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );

  return DOCS_BROWSE_COLLECTION_IDS.map((id) => {
    const definition = definitionsById.get(id);
    if (!definition) {
      throw new Error(
        `Missing docs collection definition for browse id: ${id}`,
      );
    }

    return buildBrowseCollectionSection(definition, pages, locale, messages);
  });
}

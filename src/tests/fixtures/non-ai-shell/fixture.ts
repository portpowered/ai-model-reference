import type { Root } from "fumadocs-core/page-tree";
import {
  collectMessageBodyText,
  collectMessageHeadings,
} from "@/lib/content/messages";
import type { DocsPageSource } from "@/lib/content/pages";
import type { RegistryIndexes } from "@/lib/content/registry";
import type { PageMessages } from "@/lib/content/schemas";
import type { ShellCollectionDefinition } from "@/lib/docs/collection-definition-contract";
import { resolveUiMessagePath } from "@/lib/docs/section-collection-index";
import { buildShellCollectionPageTree } from "@/lib/navigation/shell-collection-page-tree";
import { buildBaseSearchDocuments } from "@/lib/search/build-base-document";
import { enrichSearchDocuments } from "@/lib/search/enrich-search-document";
import type { BaseSearchDocument, SearchDocument } from "@/lib/search/types";

/** Test-only URL prefix; fixture pages are not published customer routes. */
export const NON_AI_SHELL_FIXTURE_URL_PREFIX = "/fixture/docs";

export const NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS = [
  "guides",
  "reference",
] as const;

export type NonAiShellFixtureCollectionId =
  (typeof NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS)[number];

export type NonAiShellFixtureRouteSlug = "guides" | "reference";

export type NonAiShellFixtureFrontmatterKind =
  | "kitchen-guide"
  | "maintenance-reference";

export type NonAiShellFixtureRegistryKind =
  | "fixture-guide"
  | "fixture-reference";

export type NonAiShellFixtureCollectionDefinition = ShellCollectionDefinition<
  NonAiShellFixtureCollectionId,
  NonAiShellFixtureRouteSlug,
  NonAiShellFixtureFrontmatterKind,
  NonAiShellFixtureRegistryKind
>;

export type NonAiShellFixturePageSource = {
  pageDir: string;
  docsSlug: string;
  url: string;
  frontmatter: {
    kind: NonAiShellFixtureFrontmatterKind;
    registryId: string;
    messageNamespace: "local";
    assetNamespace: "local";
    tags: string[];
    status: "published";
    updatedAt: string;
    aliases?: string[];
  };
  messages: PageMessages;
};

export type NonAiShellFixtureMessages = {
  browseIndex: {
    guidesSectionTitle: string;
    guidesSectionDescription: string;
    guidesSectionLinkLabel: string;
    referenceSectionTitle: string;
    referenceSectionDescription: string;
    referenceSectionLinkLabel: string;
  };
  guidesIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
  referenceIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
};

function fixtureCollectionMessageKeys(
  browsePrefix: string,
  indexPrefix: string,
) {
  return {
    browse: {
      sectionTitle: `browseIndex.${browsePrefix}SectionTitle`,
      sectionDescription: `browseIndex.${browsePrefix}SectionDescription`,
      sectionLinkLabel: `browseIndex.${browsePrefix}SectionLinkLabel`,
    },
    index: {
      title: `${indexPrefix}Index.title`,
      description: `${indexPrefix}Index.description`,
      listLabel: `${indexPrefix}Index.listLabel`,
      emptyTitle: `${indexPrefix}Index.emptyTitle`,
      emptyDescription: `${indexPrefix}Index.emptyDescription`,
      emptyHomeLink: `${indexPrefix}Index.emptyHomeLink`,
    },
  };
}

function fixtureDocsUrl(docsSlug: string): string {
  return `${NON_AI_SHELL_FIXTURE_URL_PREFIX}/${docsSlug}`;
}

const FIXTURE_UPDATED_AT = "2026-06-30T00:00:00.000Z";

export const NON_AI_SHELL_FIXTURE_MESSAGES: NonAiShellFixtureMessages = {
  browseIndex: {
    guidesSectionTitle: "Kitchen Guides",
    guidesSectionDescription:
      "Step-by-step guides for everyday cooking tasks in a shared kitchen.",
    guidesSectionLinkLabel: "Browse kitchen guides",
    referenceSectionTitle: "Maintenance Reference",
    referenceSectionDescription:
      "Lookup tables and checklists for appliance upkeep and safety codes.",
    referenceSectionLinkLabel: "Browse maintenance reference",
  },
  guidesIndex: {
    title: "Kitchen Guides",
    description: "Practical walkthroughs for shared kitchen equipment.",
    listLabel: "All kitchen guides",
    emptyTitle: "No kitchen guides yet",
    emptyDescription: "Published guides will appear here once they are added.",
    emptyHomeLink: "Back to fixture home",
  },
  referenceIndex: {
    title: "Maintenance Reference",
    description: "Short reference pages for appliance codes and upkeep.",
    listLabel: "All reference pages",
    emptyTitle: "No reference pages yet",
    emptyDescription:
      "Published reference pages will appear here once they are added.",
    emptyHomeLink: "Back to fixture home",
  },
};

export const NON_AI_SHELL_FIXTURE_COLLECTION_DEFINITIONS = [
  {
    id: "guides",
    routeSlug: "guides",
    registryKind: "fixture-guide",
    frontmatterKind: "kitchen-guide",
    starterSlugs: ["guides/stovetop-basics"],
    sidebarLabel: "Kitchen Guides",
    messageKeys: fixtureCollectionMessageKeys("guides", "guides"),
  },
  {
    id: "reference",
    routeSlug: "reference",
    registryKind: "fixture-reference",
    frontmatterKind: "maintenance-reference",
    starterSlugs: ["reference/appliance-codes"],
    sidebarLabel: "Maintenance Reference",
    messageKeys: fixtureCollectionMessageKeys("reference", "reference"),
  },
] as const satisfies readonly NonAiShellFixtureCollectionDefinition[];

const NON_AI_SHELL_FIXTURE_PAGES: readonly NonAiShellFixturePageSource[] = [
  {
    pageDir: "__fixture__/guides/stovetop-basics",
    docsSlug: "guides/stovetop-basics",
    url: fixtureDocsUrl("guides/stovetop-basics"),
    frontmatter: {
      kind: "kitchen-guide",
      registryId: "fixture.guide.stovetop-basics",
      messageNamespace: "local",
      assetNamespace: "local",
      tags: ["cooking", "safety"],
      status: "published",
      updatedAt: FIXTURE_UPDATED_AT,
      aliases: ["stovetop basics", "burner guide"],
    },
    messages: {
      title: "Stovetop Basics",
      description:
        "How to preheat burners, choose pan size, and shut down safely.",
      openingSummary:
        "A short guide for shared-kitchen stovetop use before meal prep.",
      sections: {
        preheat: {
          title: "Preheat and test heat",
          body: "Set the burner to medium and wait until the pan rim feels warm.",
        },
        shutdown: {
          title: "Shutdown checklist",
          body: "Turn off burners, move hot pans off the coil, and wipe spills.",
        },
      },
    },
  },
  {
    pageDir: "__fixture__/reference/appliance-codes",
    docsSlug: "reference/appliance-codes",
    url: fixtureDocsUrl("reference/appliance-codes"),
    frontmatter: {
      kind: "maintenance-reference",
      registryId: "fixture.reference.appliance-codes",
      messageNamespace: "local",
      assetNamespace: "local",
      tags: ["maintenance", "codes"],
      status: "published",
      updatedAt: FIXTURE_UPDATED_AT,
      aliases: ["appliance lookup", "service codes"],
    },
    messages: {
      title: "Appliance Service Codes",
      description:
        "Common dishwasher and oven fault codes with first-response steps.",
      sections: {
        dishwasher: {
          title: "Dishwasher codes",
          body: "E1 means the drain path is blocked; clear the filter basket first.",
        },
        oven: {
          title: "Oven codes",
          body: "F3 indicates a temperature sensor fault that needs a reset cycle.",
        },
      },
    },
  },
];

const definitionsById = new Map<
  NonAiShellFixtureCollectionId,
  NonAiShellFixtureCollectionDefinition
>(
  NON_AI_SHELL_FIXTURE_COLLECTION_DEFINITIONS.map((definition) => [
    definition.id,
    definition,
  ]),
);

export function listNonAiShellFixtureCollectionDefinitions(): readonly NonAiShellFixtureCollectionDefinition[] {
  return NON_AI_SHELL_FIXTURE_COLLECTION_DEFINITIONS;
}

export function getNonAiShellFixtureCollectionDefinition(
  id: NonAiShellFixtureCollectionId,
): NonAiShellFixtureCollectionDefinition {
  const definition = definitionsById.get(id);
  if (!definition) {
    throw new Error(`Unknown non-AI shell fixture collection id: ${id}`);
  }
  return definition;
}

export function listNonAiShellFixturePages(): readonly NonAiShellFixturePageSource[] {
  return NON_AI_SHELL_FIXTURE_PAGES;
}

export function listNonAiShellFixturePagesForCollection(
  collectionId: NonAiShellFixtureCollectionId,
): NonAiShellFixturePageSource[] {
  const definition = getNonAiShellFixtureCollectionDefinition(collectionId);
  return NON_AI_SHELL_FIXTURE_PAGES.filter(
    (page) => page.frontmatter.kind === definition.frontmatterKind,
  );
}

export function loadNonAiShellFixtureMessages(): NonAiShellFixtureMessages {
  return NON_AI_SHELL_FIXTURE_MESSAGES;
}

export function resolveNonAiShellFixtureCollectionIndexMessages(
  collectionId: NonAiShellFixtureCollectionId,
): {
  title: string;
  description: string;
  listLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyHomeLink: string;
} {
  const messages = loadNonAiShellFixtureMessages();
  const definition = getNonAiShellFixtureCollectionDefinition(collectionId);
  return {
    title: resolveUiMessagePath(messages, definition.messageKeys.index.title),
    description: resolveUiMessagePath(
      messages,
      definition.messageKeys.index.description,
    ),
    listLabel: resolveUiMessagePath(
      messages,
      definition.messageKeys.index.listLabel,
    ),
    emptyTitle: resolveUiMessagePath(
      messages,
      definition.messageKeys.index.emptyTitle,
    ),
    emptyDescription: resolveUiMessagePath(
      messages,
      definition.messageKeys.index.emptyDescription,
    ),
    emptyHomeLink: resolveUiMessagePath(
      messages,
      definition.messageKeys.index.emptyHomeLink,
    ),
  };
}

export function emptyNonAiShellFixtureRegistryIndexes(): RegistryIndexes {
  return {
    byId: new Map(),
    bySlug: new Map(),
    classificationsById: new Map(),
    tagsById: new Map(),
    tagsBySlug: new Map(),
  };
}

export function nonAiShellFixtureSearchableText(
  page: NonAiShellFixturePageSource,
): { headings: string[]; bodyText: string } {
  return {
    headings: collectMessageHeadings(page.messages),
    bodyText: collectMessageBodyText(page.messages),
  };
}

export function buildNonAiShellFixturePageTree(): Root {
  return buildShellCollectionPageTree(
    {
      name: "Fixture docs",
      children: [],
    },
    {
      pages: listNonAiShellFixturePages(),
      definitions: listNonAiShellFixtureCollectionDefinitions(),
      collectionIds: NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS,
    },
  );
}

function toDocsPageSource(page: NonAiShellFixturePageSource): DocsPageSource {
  return page as unknown as DocsPageSource;
}

export function buildNonAiShellFixtureBaseSearchDocuments(): BaseSearchDocument[] {
  return buildBaseSearchDocuments(
    listNonAiShellFixturePages().map(toDocsPageSource),
    emptyNonAiShellFixtureRegistryIndexes(),
  );
}

/** Generic search path for fixture proof: base documents plus shared enrichment only. */
export function buildNonAiShellFixtureSearchDocuments(): SearchDocument[] {
  const indexes = emptyNonAiShellFixtureRegistryIndexes();
  return enrichSearchDocuments(
    buildNonAiShellFixtureBaseSearchDocuments(),
    indexes,
  );
}

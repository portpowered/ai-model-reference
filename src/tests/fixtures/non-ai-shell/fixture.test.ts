import { describe, expect, test } from "bun:test";
import { resolveUiMessagePath } from "@/lib/docs/section-collection-index";
import {
  emptyNonAiShellFixtureRegistryIndexes,
  getNonAiShellFixtureCollectionDefinition,
  listNonAiShellFixtureCollectionDefinitions,
  listNonAiShellFixturePages,
  listNonAiShellFixturePagesForCollection,
  loadNonAiShellFixtureMessages,
  NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS,
  NON_AI_SHELL_FIXTURE_URL_PREFIX,
  nonAiShellFixtureSearchableText,
  resolveNonAiShellFixtureCollectionIndexMessages,
} from "./fixture";

describe("non-AI shell fixture inventory", () => {
  test("defines two collections with distinct ids, route slugs, and frontmatter kinds", () => {
    const definitions = listNonAiShellFixtureCollectionDefinitions();

    expect(definitions).toHaveLength(2);
    expect(definitions.map((definition) => definition.id)).toEqual([
      "guides",
      "reference",
    ]);
    expect(definitions.map((definition) => definition.routeSlug)).toEqual([
      "guides",
      "reference",
    ]);
    expect(definitions.map((definition) => definition.frontmatterKind)).toEqual(
      ["kitchen-guide", "maintenance-reference"],
    );
    expect(
      new Set(definitions.map((definition) => definition.registryKind)).size,
    ).toBe(2);
  });

  test("keeps fixture browse collection order explicit", () => {
    expect(NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS).toEqual([
      "guides",
      "reference",
    ]);
    expect(
      listNonAiShellFixtureCollectionDefinitions().map(
        (definition) => definition.id,
      ),
    ).toEqual([...NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS]);
  });

  test("provides browse and section-index message metadata for each collection", () => {
    const messages = loadNonAiShellFixtureMessages();

    for (const collectionId of NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS) {
      const definition = getNonAiShellFixtureCollectionDefinition(collectionId);
      const indexMessages =
        resolveNonAiShellFixtureCollectionIndexMessages(collectionId);

      expect(
        resolveUiMessagePath(
          messages,
          definition.messageKeys.browse.sectionTitle,
        ).length,
      ).toBeGreaterThan(0);
      expect(
        resolveUiMessagePath(
          messages,
          definition.messageKeys.browse.sectionDescription,
        ).length,
      ).toBeGreaterThan(0);
      expect(
        resolveUiMessagePath(
          messages,
          definition.messageKeys.browse.sectionLinkLabel,
        ).length,
      ).toBeGreaterThan(0);
      expect(indexMessages.title.length).toBeGreaterThan(0);
      expect(indexMessages.description.length).toBeGreaterThan(0);
      expect(indexMessages.listLabel.length).toBeGreaterThan(0);
      expect(indexMessages.emptyTitle.length).toBeGreaterThan(0);
      expect(indexMessages.emptyDescription.length).toBeGreaterThan(0);
      expect(indexMessages.emptyHomeLink.length).toBeGreaterThan(0);
      expect(definition.sidebarLabel.length).toBeGreaterThan(0);
    }
  });
});

describe("non-AI shell fixture pages", () => {
  test("includes at least one representative page per collection", () => {
    for (const collectionId of NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS) {
      const pages = listNonAiShellFixturePagesForCollection(collectionId);
      expect(pages.length).toBeGreaterThanOrEqual(1);
    }
  });

  test("pages expose title, description, slug, href, tags, and indexable content", () => {
    const pages = listNonAiShellFixturePages();

    expect(pages.length).toBeGreaterThanOrEqual(2);

    for (const page of pages) {
      expect(page.messages.title.length).toBeGreaterThan(0);
      expect(page.messages.description.length).toBeGreaterThan(0);
      expect(page.docsSlug.length).toBeGreaterThan(0);
      expect(page.url.startsWith(NON_AI_SHELL_FIXTURE_URL_PREFIX)).toBe(true);
      expect(page.frontmatter.tags.length).toBeGreaterThan(0);

      const searchable = nonAiShellFixtureSearchableText(page);
      expect(searchable.headings.length).toBeGreaterThan(1);
      expect(searchable.bodyText).toContain(page.messages.title);
      expect(searchable.bodyText.length).toBeGreaterThan(
        page.messages.description.length,
      );
    }
  });

  test("uses fixture registry ids without loading AI registry records", () => {
    const indexes = emptyNonAiShellFixtureRegistryIndexes();

    expect(indexes.byId.size).toBe(0);
    expect(indexes.tagsBySlug.size).toBe(0);

    for (const page of listNonAiShellFixturePages()) {
      expect(page.frontmatter.registryId.startsWith("fixture.")).toBe(true);
      expect(indexes.byId.has(page.frontmatter.registryId)).toBe(false);
    }
  });
});

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  getNonAiShellFixtureCollectionDefinition,
  listNonAiShellFixturePagesForCollection,
  loadNonAiShellFixtureMessages,
  NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS,
  NON_AI_SHELL_FIXTURE_URL_PREFIX,
  resolveNonAiShellFixtureCollectionIndexMessages,
} from "./fixture";
import {
  renderNonAiShellFixtureBrowsePage,
  renderNonAiShellFixtureEmptySectionIndexPage,
  renderNonAiShellFixtureSectionIndexPage,
} from "./shell-renderers";

function headingIdPosition(html: string, headingId: string): number {
  const position = html.indexOf(`id="${headingId}"`);
  expect(position).toBeGreaterThanOrEqual(0);
  return position;
}

function extractIndexListEntryHrefs(html: string, listLabel: string): string[] {
  const escapedLabel = listLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const listMatch = html.match(
    new RegExp(`<ul[^>]*aria-label="${escapedLabel}"[^>]*>([\\s\\S]*?)</ul>`),
  );

  if (!listMatch) {
    return [];
  }

  return [...listMatch[1].matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

describe("non-AI shell fixture browse render", () => {
  test("renders both fixture collection sections in fixture-defined order", () => {
    const messages = loadNonAiShellFixtureMessages();
    const html = renderToStaticMarkup(renderNonAiShellFixtureBrowsePage());

    const guidesHeadingPosition = headingIdPosition(html, "guides-heading");
    const referenceHeadingPosition = headingIdPosition(
      html,
      "reference-heading",
    );
    expect(guidesHeadingPosition).toBeLessThan(referenceHeadingPosition);

    expect(html).toContain(messages.browseIndex.guidesSectionTitle);
    expect(html).toContain(messages.browseIndex.referenceSectionTitle);
  });

  test("renders browse section copy, destination links, and representative entries", () => {
    const messages = loadNonAiShellFixtureMessages();
    const html = renderToStaticMarkup(renderNonAiShellFixtureBrowsePage());

    for (const collectionId of NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS) {
      const definition = getNonAiShellFixtureCollectionDefinition(collectionId);
      const pages = listNonAiShellFixturePagesForCollection(collectionId);
      const representativePage = pages[0];

      expect(html).toContain(
        messages.browseIndex[
          `${collectionId}SectionDescription` as keyof typeof messages.browseIndex
        ],
      );
      expect(html).toContain(
        messages.browseIndex[
          `${collectionId}SectionLinkLabel` as keyof typeof messages.browseIndex
        ],
      );
      expect(html).toContain(
        `href="${NON_AI_SHELL_FIXTURE_URL_PREFIX}/${definition.routeSlug}"`,
      );
      expect(html).toContain(`href="${representativePage.url}"`);
      expect(html).toContain(representativePage.messages.title);
    }
  });
});

describe("non-AI shell fixture section index render", () => {
  for (const collectionId of NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS) {
    test(`renders ${collectionId} index title, description, list label, and page hrefs`, async () => {
      const indexMessages =
        resolveNonAiShellFixtureCollectionIndexMessages(collectionId);
      const pages = listNonAiShellFixturePagesForCollection(collectionId);
      const html = renderToStaticMarkup(
        await renderNonAiShellFixtureSectionIndexPage(collectionId),
      );

      expect(html).toContain(indexMessages.title);
      expect(html).toContain(indexMessages.description);
      expect(html).toContain(`aria-label="${indexMessages.listLabel}"`);

      for (const page of pages) {
        expect(html).toContain(`href="${page.url}"`);
        expect(html).toContain(page.messages.title);
      }
    });
  }

  test("lists fixture pages in title-sorted order", async () => {
    const collectionId = "guides";
    const indexMessages =
      resolveNonAiShellFixtureCollectionIndexMessages(collectionId);
    const html = renderToStaticMarkup(
      await renderNonAiShellFixtureSectionIndexPage(collectionId),
    );
    const renderedHrefs = extractIndexListEntryHrefs(
      html,
      indexMessages.listLabel,
    );
    const expectedHrefs = listNonAiShellFixturePagesForCollection(collectionId)
      .sort((left, right) =>
        left.messages.title.localeCompare(right.messages.title, "en", {
          sensitivity: "base",
        }),
      )
      .map((page) => page.url);

    expect(renderedHrefs).toEqual(expectedHrefs);
  });
});

describe("non-AI shell fixture section index empty state", () => {
  test("renders fixture-configured empty copy instead of AI model empty-state text", async () => {
    const aiMessages = await loadUiMessages();
    const indexMessages =
      resolveNonAiShellFixtureCollectionIndexMessages("guides");
    const html = renderToStaticMarkup(
      await renderNonAiShellFixtureEmptySectionIndexPage("guides"),
    );

    expect(html).toContain(indexMessages.emptyTitle);
    expect(html).toContain(indexMessages.emptyDescription);
    expect(html).toContain(indexMessages.emptyHomeLink);
    expect(html).not.toContain(aiMessages.modelsIndex.emptyTitle);
    expect(html).not.toContain(`aria-label="${indexMessages.listLabel}"`);
  });
});

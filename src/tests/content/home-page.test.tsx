import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeArticle } from "@/components/home/home-article";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { PLACEHOLDER_SIDEBAR_DESCRIPTION } from "@/lib/navigation/docs-sidebar-contract";
import { buildHomeTableOfContents } from "@/lib/navigation/home-page-toc";
import { expectHomeArticleSingleSearchEntry } from "@/tests/discovery/home-search-entry-contract";

/** Discovery targets on `/` must stay aligned with Phase 1 acceptance criteria. */
const HOME_DISCOVERY_HREFS = [
  "/docs/architecture",
  "/docs/glossary",
  "/tags",
  "/docs/modules/grouped-query-attention",
  "/docs/glossary/token",
] as const;

describe("home page messages", () => {
  it("loads localized copy for title, search, and browse sections", async () => {
    const { home } = await loadUiMessages();
    expect(home.title).toBe("Model Atlas");
    expect(home.subtitle.length).toBeGreaterThan(0);
    expect(home.intro.length).toBeGreaterThan(0);
    expect(home.searchHandoff.length).toBeGreaterThan(0);
    expect(home.searchHandoff.toLowerCase()).toContain("header");
    expect(home.browseSectionTitle.length).toBeGreaterThan(0);
    expect(home.architectureLinkTitle).toBe("Architecture");
    expect(home.glossaryLinkTitle).toBe("Glossary");
    expect(home.tagsLinkTitle).toBe("Tags");
    expect(home.tokenLinkTitle).toBe("Token (glossary)");
    expect(home.docsLinkTitle).toBe("Grouped-query attention");
    expect(home.searchPageLinkTitle.length).toBeGreaterThan(0);
    expect(home.onThisPageBrowse).toBe("Browse");
  });

  it("defines browse link titles for every Phase 1 discovery index", async () => {
    const { home } = await loadUiMessages();
    expect(home.architectureLinkDescription.length).toBeGreaterThan(0);
    expect(home.glossaryLinkDescription.length).toBeGreaterThan(0);
    expect(home.tagsLinkDescription.length).toBeGreaterThan(0);
    expect(home.tokenLinkDescription.length).toBeGreaterThan(0);
    expect(home.docsLinkDescription.length).toBeGreaterThan(0);
    expect(home.searchHandoffLinkSuffix.length).toBeGreaterThan(0);
    expect(HOME_DISCOVERY_HREFS).toHaveLength(5);
  });
});

describe("home page render", () => {
  async function renderHomeArticleHtml(): Promise<string> {
    const messages = await loadUiMessages();
    return renderToStaticMarkup(<HomeArticle messages={messages} />);
  }

  it("links to indexes, sample module, and token glossary", async () => {
    const html = await renderHomeArticleHtml();
    expect(html).toContain("Model Atlas");
    for (const href of HOME_DISCOVERY_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("links to /search for bookmark and handoff entry without inline search UI", async () => {
    const html = await renderHomeArticleHtml();
    expectHomeArticleSingleSearchEntry(html);
  });

  it("does not render placeholder scaffold copy in the article body", async () => {
    const html = await renderHomeArticleHtml();
    expect(html).not.toContain(PLACEHOLDER_SIDEBAR_DESCRIPTION);
    expect(html).not.toContain("lorem");
  });

  it("defines On this page Browse anchor without a removed #search target", async () => {
    const { home } = await loadUiMessages();
    const toc = buildHomeTableOfContents(home);
    const html = await renderHomeArticleHtml();

    expect(toc.some((item) => item.url === "#browse")).toBe(true);
    expect(toc.some((item) => item.url === "#search")).toBe(false);
    expect(html).toContain('id="browse"');
    expect(html).not.toContain('id="search"');
  });
});

import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "@/app/(site)/page";
import { loadUiMessages } from "@/lib/content/ui-messages";

/** Discovery targets on `/` must stay aligned with Phase 1 acceptance criteria. */
const HOME_DISCOVERY_HREFS = [
  "/search",
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
    expect(home.searchSectionTitle.length).toBeGreaterThan(0);
    expect(home.browseSectionTitle.length).toBeGreaterThan(0);
    expect(home.architectureLinkTitle).toBe("Architecture");
    expect(home.glossaryLinkTitle).toBe("Glossary");
    expect(home.tagsLinkTitle).toBe("Tags");
    expect(home.tokenLinkTitle).toBe("Token (glossary)");
    expect(home.docsLinkTitle).toBe("Grouped-query attention");
    expect(home.searchPageLinkTitle.length).toBeGreaterThan(0);
  });

  it("defines browse link titles for every Phase 1 discovery index", async () => {
    const { home } = await loadUiMessages();
    expect(home.architectureLinkDescription.length).toBeGreaterThan(0);
    expect(home.glossaryLinkDescription.length).toBeGreaterThan(0);
    expect(home.tagsLinkDescription.length).toBeGreaterThan(0);
    expect(home.tokenLinkDescription.length).toBeGreaterThan(0);
    expect(home.docsLinkDescription.length).toBeGreaterThan(0);
    expect(home.searchPageLinkDescription.length).toBeGreaterThan(0);
    expect(HOME_DISCOVERY_HREFS).toHaveLength(6);
  });
});

describe("home page render", () => {
  it("links to search, indexes, sample module, and token glossary", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Model Atlas");
    for (const href of HOME_DISCOVERY_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("exposes global search dialog entry and documented /search page link", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("data-search");
    expect(html).toContain('href="/search"');
  });

  it("does not render placeholder scaffold copy in the article body", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).not.toContain("placeholder");
    expect(html).not.toContain("lorem");
  });
});

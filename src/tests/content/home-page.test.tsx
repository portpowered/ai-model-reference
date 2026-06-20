import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeArticle } from "@/components/home/home-article";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { PLACEHOLDER_SIDEBAR_DESCRIPTION } from "@/lib/navigation/docs-sidebar-contract";
import { buildHomeTableOfContents } from "@/lib/navigation/home-page-toc";
import { expectHomeArticleHeaderOnlySearchEntry } from "@/tests/discovery/home-search-entry-contract";

/** Discovery targets on `/` must stay aligned with Phase 1 acceptance criteria. */
const HOME_DISCOVERY_HREFS = [
  "/browse",
  "/docs/modules/grouped-query-attention",
  "/docs/modules/swiglu",
  "/docs/modules/relu",
] as const;

describe("home page messages", () => {
  it("loads localized copy for title, search, and browse sections", async () => {
    const { home } = await loadUiMessages();
    expect(home.title).toBe("Model Atlas");
    expect(home.subtitle.length).toBeGreaterThan(0);
    expect(home.intro.length).toBeGreaterThan(0);
    expect(home.intro).not.toMatch(/Search by alias/i);
    expect(home.intro).not.toMatch(/search by tag/i);
    expect(home.browseSectionTitle.length).toBeGreaterThan(0);
    expect(home.atlasLinkTitle).toBe("Browse the atlas");
    expect(home.gqaLinkTitle).toBe("Grouped-query attention");
    expect(home.swigluLinkTitle).toBe("SwiGLU");
    expect(home.reluLinkTitle).toBe("ReLU");
    expect(home.onThisPageBrowse).toBe("Browse");
  });

  it("defines browse link titles for every homepage module shortcut", async () => {
    const { home } = await loadUiMessages();
    expect(home.atlasLinkDescription.length).toBeGreaterThan(0);
    expect(home.gqaLinkDescription.length).toBeGreaterThan(0);
    expect(home.swigluLinkDescription.length).toBeGreaterThan(0);
    expect(home.reluLinkDescription.length).toBeGreaterThan(0);
    expect(home.gqaLinkDescription).not.toMatch(/Phase 1/i);
    expect(home.swigluLinkDescription).not.toMatch(/Phase 1/i);
    expect(HOME_DISCOVERY_HREFS).toHaveLength(4);
  });
});

describe("home page render", () => {
  async function renderHomeArticleHtml(): Promise<string> {
    const messages = await loadUiMessages();
    return renderToStaticMarkup(<HomeArticle messages={messages} />);
  }

  it("links to concrete starter module pages", async () => {
    const html = await renderHomeArticleHtml();
    expect(html).toContain("Model Atlas");
    for (const href of HOME_DISCOVERY_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("preserves the active locale in browse links on the vietnamese route surface", async () => {
    const messages = await loadUiMessages("vi");
    const html = renderToStaticMarkup(
      <HomeArticle messages={messages} locale="vi" />,
    );

    expect(html).toContain("Cẩm nang về các mô hình và module AI hiện đại");
    expect(html).toContain('href="/vi/browse"');
    expect(html).toContain('href="/vi/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/swiglu"');
    expect(html).toContain('href="/docs/modules/relu"');
    expect(html).not.toContain('href="/vi/docs/modules/swiglu"');
    expect(html).not.toContain('href="/vi/docs/modules/relu"');
  });

  it("preserves the active locale in browse links on the japanese route surface", async () => {
    const messages = await loadUiMessages("ja");
    const html = renderToStaticMarkup(
      <HomeArticle messages={messages} locale="ja" />,
    );

    expect(html).toContain(
      "現代の AI モデルとモジュールのためのフィールドガイド",
    );
    expect(html).toContain('href="/ja/browse"');
    expect(html).toContain('href="/ja/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/swiglu"');
    expect(html).toContain('href="/docs/modules/relu"');
    expect(html).not.toContain('href="/ja/docs/modules/swiglu"');
    expect(html).not.toContain('href="/ja/docs/modules/relu"');
  });

  it("omits verbose search handoff prose and inline /search link", async () => {
    const html = await renderHomeArticleHtml();
    expect(html).not.toContain("Search entry page");
    expect(html).not.toContain(
      "Use the Search control in the header to jump to modules",
    );
    expect(html).not.toContain("Search by alias or tag");
    expectHomeArticleHeaderOnlySearchEntry(html);
  });

  it("does not render placeholder scaffold copy in the article body", async () => {
    const html = await renderHomeArticleHtml();
    expect(html).not.toContain(PLACEHOLDER_SIDEBAR_DESCRIPTION);
    expect(html).not.toContain("lorem");
  });

  it("renders browse cards as bulletless links without persistent underlines", async () => {
    const html = await renderHomeArticleHtml();

    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
    expect(html).toContain("no-underline");
    const withoutNoUnderline = html.replaceAll("no-underline", "");
    expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);
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

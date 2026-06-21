import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBrowseIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("browse index messages", () => {
  it("loads localized copy for the browse page", async () => {
    const messages = await loadUiMessages();
    expect(messages.browseIndex.title).toBe("Browse the Atlas");
    expect(messages.browseIndex.description.length).toBeGreaterThan(0);
    expect(
      messages.browseIndex.modelsSectionDescription.length,
    ).toBeGreaterThan(0);
  });
});

describe("browse index page render", () => {
  it("renders quick routes and starter sections across the main content kinds", async () => {
    const page = await renderBrowseIndexPage();
    const html = renderToStaticMarkup(page);

    for (const href of [
      "/search",
      "/docs/glossary",
      "/docs/architecture",
      "/tags",
      "/docs/models/gpt-3",
      "/docs/modules/grouped-query-attention",
      "/docs/concepts/transformer-architecture",
      "/docs/papers/deepseek-v4",
      "/docs/training/on-policy-distillation",
      "/docs/systems/routing",
      "/docs/systems/on-disk-kv-cache",
      "/docs/glossary/token",
    ] as const) {
      expect(html).toContain(`href="${href}"`);
    }

    for (const label of [
      "Quick routes",
      "Models",
      "Modules",
      "Concepts",
      "Papers",
      "Training",
      "Systems",
      "Glossary",
      "Browse the full glossary",
    ] as const) {
      expect(html).toContain(label);
    }

    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });

  it("renders localized vietnamese browse routes and shipped starter pages", async () => {
    const page = await renderBrowseIndexPage("vi");
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Duyệt Atlas");
    expect(html).toContain('href="/vi/search"');
    expect(html).toContain('href="/vi/docs/glossary"');
    expect(html).toContain('href="/vi/tags"');
    expect(html).toContain('href="/vi/docs/glossary/token"');
  });

  it("renders activation graph-map state from URL parameters on first load", async () => {
    const page = await renderBrowseIndexPage(undefined, {
      searchParams: Promise.resolve({
        classification: "activation-functions",
        mode: "graph-map",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Activation Functions Graph Map");
    expect(html).toContain("Selected classification");
    expect(html).toContain("Activation Functions");
    expect(html).toContain("Selected surface");
    expect(html).toContain("Graph Map");
    expect(html).toContain("Module classifications");
    expect(html).toContain('aria-label="Topology module classifications"');
    expect(html).toContain(
      'href="/browse?classification=feed-forward-networks&amp;mode=graph-map"',
    );
    expect(html).toMatch(
      /<a aria-current="page"[^>]*href="\/browse\?classification=activation-functions&amp;mode=graph-map"[^>]*>Activation Functions<\/a>/,
    );
    expect(html).toContain("Classification tree");
    expect(html).toContain("Published modules");
    expect(html).toContain("Visible members");
    expect(html).toContain("Rectified Linear Unit");
    expect(html).toContain('href="/docs/modules/relu"');
  });

  it("falls back to canonical member routes and readable summaries on localized topology trees", async () => {
    const page = await renderBrowseIndexPage("vi", {
      searchParams: Promise.resolve({
        classification: "activation-functions",
        mode: "graph-map",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Bản đồ đồ thị Hàm kích hoạt");
    expect(html).toContain("Phân loại đã chọn");
    expect(html).toContain('href="/docs/modules/relu"');
    expect(html).not.toContain('href="/vi/docs/modules/relu"');
    expect(html).toContain(
      "A simple activation function that keeps positive values and turns negative values into zero.",
    );
    expect(html).not.toContain(">description<");
  });

  it("renders feed-forward timeline state from URL parameters on first load", async () => {
    const page = await renderBrowseIndexPage(undefined, {
      searchParams: Promise.resolve({
        classification: "feed-forward-networks",
        mode: "timeline",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Feed Forward Networks Timeline");
    expect(html).toContain("Timeline");
    expect(html).toContain(
      'href="/browse?classification=activation-functions&amp;mode=timeline"',
    );
    expect(html).toMatch(
      /<a aria-current="page"[^>]*href="\/browse\?classification=feed-forward-networks&amp;mode=timeline"[^>]*>Feed Forward Networks<\/a>/,
    );
    expect(html).toContain("Feed-Forward Network");
    expect(html).toContain('href="/docs/modules/feed-forward-network"');
  });

  it("renders invalid topology state and valid seed links for unsupported URL parameters", async () => {
    const page = await renderBrowseIndexPage(undefined, {
      searchParams: Promise.resolve({
        classification: "attention",
        mode: "matrix",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Invalid topology selection");
    expect(html).toContain("attention");
    expect(html).toContain("matrix");
    expect(html).toContain(
      'href="/browse?classification=activation-functions&amp;mode=graph-map"',
    );
    expect(html).toContain(
      'href="/browse?classification=feed-forward-networks&amp;mode=timeline"',
    );
  });

  it("ignores server search params during static export rendering", async () => {
    const previousStaticExport = process.env.NEXT_STATIC_EXPORT;
    process.env.NEXT_STATIC_EXPORT = "1";

    try {
      const page = await renderBrowseIndexPage(undefined, {
        searchParams: Promise.resolve({
          classification: "activation-functions",
          mode: "graph-map",
        }),
      });
      const html = renderToStaticMarkup(page);

      expect(html).toContain("Browse the Atlas");
      expect(html).not.toContain("Activation Functions Graph Map");
    } finally {
      process.env.NEXT_STATIC_EXPORT = previousStaticExport;
    }
  });
});

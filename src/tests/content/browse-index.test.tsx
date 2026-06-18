import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBrowseIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("browse index messages", () => {
  it("loads localized copy for the browse page", async () => {
    const messages = await loadUiMessages();
    expect(messages.browseIndex.title).toBe("Browse the Atlas");
    expect(messages.browseIndex.description.length).toBeGreaterThan(0);
    expect(messages.browseIndex.modelsSectionDescription.length).toBeGreaterThan(
      0,
    );
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
      "/docs/glossary/token",
    ] as const) {
      expect(html).toContain(`href="${href}"`);
    }

    for (const label of [
      "Quick routes",
      "Models",
      "Modules",
      "Concepts",
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
});

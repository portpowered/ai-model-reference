import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { docsSearchApi } from "@/lib/search/search-server";

describe("attention is all you need discovery surfaces (attention-is-all-you-need-paper-page-005)", () => {
  test.each([
    "Attention Is All You Need",
    "Transformer paper",
    "Vaswani transformer paper",
  ])("search routes %s to the canonical attention paper page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/docs/papers/attention-is-all-you-need");
  });

  test("multi-head attention search still exposes the attention paper as a direct result", async () => {
    const results = await docsSearchApi.search("multi-head attention");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (result) => result.url === "/docs/papers/attention-is-all-you-need",
      ),
    ).toBe(true);
  });

  test("attention tag landing exposes a navigable link to the attention paper", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "attention" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('href="/docs/papers/attention-is-all-you-need"');
    expect(html).toContain("Attention Is All You Need");
  });
});

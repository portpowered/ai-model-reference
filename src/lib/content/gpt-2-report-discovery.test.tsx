import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModulePage } from "@/lib/content/module-page";
import { docsSearchApi } from "@/lib/search/search-server";

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("gpt-2 report discovery surfaces (gpt-2-report-paper-page-003)", () => {
  test.each([
    "GPT-2 report",
    "Language Models are Unsupervised Multitask Learners",
    "OpenAI GPT-2 paper",
  ])("search routes %s to the canonical gpt-2 report page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/docs/papers/gpt-2-report");
  });

  test("decoder-only transformer paper search still exposes the gpt-2 report as a direct result", async () => {
    const results = await docsSearchApi.search(
      "decoder-only transformer paper",
    );
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((result) => result.url === "/docs/papers/gpt-2-report"),
    ).toBe(true);
  });

  test("byte-level tokenization exposes a navigable related-doc link to the gpt-2 report", async () => {
    const page = await loadModulePage("byte-level-tokenization");
    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/papers/gpt-2-report"');
    expect(html).toContain("GPT-2 report");
  });
});

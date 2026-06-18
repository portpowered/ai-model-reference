import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";

const CODE_MODEL_URLS = [
  "/docs/models/code-repair-models",
  "/docs/models/code-llama",
  "/docs/models/starcoder",
  "/docs/models/deepseek-coder",
  "/docs/models/qwen-coder",
  "/docs/models/codestral",
] as const;

describe("chapter 7 code-model pages", () => {
  test("published docs discovery includes the new code-oriented model pages", async () => {
    const pages = await loadPublishedDocsPages("en");
    const urls = pages.map((page) => page.url);

    expect(urls).toEqual(expect.arrayContaining([...CODE_MODEL_URLS]));
  });

  test("code model pages render canonical sections and explicit empty states", async () => {
    const codeLlama = await loadModelPage("code-llama");
    const starcoder = await loadModelPage("starcoder");
    const deepseekCoder = await loadModelPage("deepseek-coder");
    const qwenCoder = await loadModelPage("qwen-coder");
    const codestral = await loadModelPage("codestral");

    for (const page of [
      codeLlama,
      starcoder,
      deepseekCoder,
      qwenCoder,
      codestral,
    ]) {
      const html = renderToStaticMarkup(
        <ModulePageProviders messages={page.messages} assets={page.assets}>
          {page.content}
        </ModulePageProviders>,
      );

      expect(html).toContain('data-testid="model-at-a-glance"');
      expect(html).toContain('data-testid="model-module-list"');
      expect(html).toContain(
        "Structured training-regime details are not available yet.",
      );
      expect(html).toContain(
        "Structured dataset details are not available yet.",
      );
      expect(html).toContain("Structured paper links are not available yet.");
      expect(html).toContain("/docs/models/code-repair-models");
    }
  });

  test("code-model category page renders related checkpoint links", async () => {
    const page = await loadModelPage("code-repair-models");
    const html = renderToStaticMarkup(
      <ModulePageProviders messages={page.messages} assets={page.assets}>
        {page.content}
      </ModulePageProviders>,
    );

    expect(html).toContain("/docs/models/code-llama");
    expect(html).toContain("/docs/models/starcoder");
    expect(html).toContain("/docs/models/deepseek-coder");
    expect(html).toContain("/docs/models/qwen-coder");
    expect(html).toContain("/docs/models/codestral");
    expect(html).toContain('href="/tags/model-family"');
  });
});

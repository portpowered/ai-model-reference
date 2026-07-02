import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { loadModulePage } from "@/lib/content/module-page";
import { docsSearchApi } from "@/lib/search/search-server";

setDefaultTimeout(15_000);

describe("mixture-of-experts discovery surfaces", () => {
  test.each([
    "mixture of experts",
    "MoE",
    "sparse MoE",
  ])("live search ranks %s to the canonical concept page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results[0]?.url).toBe("/docs/concepts/mixture-of-experts");
  });

  test("nearby shipped module and model pages expose navigable links to the canonical concept page", async () => {
    const feedForwardPage = await loadModulePage("feed-forward-network");
    const feedForwardHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: feedForwardPage.messages,
        assets: feedForwardPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: feedForwardPage.content,
      }),
    );
    expect(feedForwardHtml).toContain(
      'href="/docs/concepts/mixture-of-experts"',
    );

    const standardFfnPage = await loadModulePage("standard-ffn");
    const standardFfnHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: standardFfnPage.messages,
        assets: standardFfnPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: standardFfnPage.content,
      }),
    );
    expect(standardFfnHtml).toContain(
      'href="/docs/concepts/mixture-of-experts"',
    );

    const deepseekMoePage = await loadModulePage("deepseekmoe");
    const deepseekMoeHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: deepseekMoePage.messages,
        assets: deepseekMoePage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: deepseekMoePage.content,
      }),
    );
    expect(deepseekMoeHtml).toContain(
      'href="/docs/concepts/mixture-of-experts"',
    );

    const deepseekV4ProPage = await loadModelPage("deepseek-v4-pro");
    const deepseekV4ProHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: deepseekV4ProPage.messages,
        assets: deepseekV4ProPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: deepseekV4ProPage.content,
      }),
    );
    expect(deepseekV4ProHtml).toContain(
      'href="/docs/concepts/mixture-of-experts"',
    );
  });
});

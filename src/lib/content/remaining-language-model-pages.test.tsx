import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";

const REMAINING_LANGUAGE_MODEL_URLS = [
  "/docs/models/mistral",
  "/docs/models/mixtral",
  "/docs/models/gemma",
  "/docs/models/phi",
  "/docs/models/falcon",
  "/docs/models/opt",
  "/docs/models/olmo",
] as const;

describe("chapter 7 remaining named language model pages", () => {
  test("published docs discovery includes the new checkpoint pages", async () => {
    const pages = await loadPublishedDocsPages("en");
    const urls = pages.map((page) => page.url);

    expect(urls).toEqual(
      expect.arrayContaining([...REMAINING_LANGUAGE_MODEL_URLS]),
    );
  });

  test("new checkpoint pages render canonical sections, adjacent model links, and explicit empty states", async () => {
    const mistral = await loadModelPage("mistral");
    const mixtral = await loadModelPage("mixtral");
    const gemma = await loadModelPage("gemma");
    const phi = await loadModelPage("phi");
    const falcon = await loadModelPage("falcon");
    const opt = await loadModelPage("opt");
    const olmo = await loadModelPage("olmo");

    const mistralHtml = renderToStaticMarkup(
      <ModulePageProviders messages={mistral.messages} assets={mistral.assets}>
        {mistral.content}
      </ModulePageProviders>,
    );
    const mixtralHtml = renderToStaticMarkup(
      <ModulePageProviders messages={mixtral.messages} assets={mixtral.assets}>
        {mixtral.content}
      </ModulePageProviders>,
    );
    const gemmaHtml = renderToStaticMarkup(
      <ModulePageProviders messages={gemma.messages} assets={gemma.assets}>
        {gemma.content}
      </ModulePageProviders>,
    );
    const phiHtml = renderToStaticMarkup(
      <ModulePageProviders messages={phi.messages} assets={phi.assets}>
        {phi.content}
      </ModulePageProviders>,
    );
    const falconHtml = renderToStaticMarkup(
      <ModulePageProviders messages={falcon.messages} assets={falcon.assets}>
        {falcon.content}
      </ModulePageProviders>,
    );
    const optHtml = renderToStaticMarkup(
      <ModulePageProviders messages={opt.messages} assets={opt.assets}>
        {opt.content}
      </ModulePageProviders>,
    );
    const olmoHtml = renderToStaticMarkup(
      <ModulePageProviders messages={olmo.messages} assets={olmo.assets}>
        {olmo.content}
      </ModulePageProviders>,
    );

    for (const html of [
      mistralHtml,
      mixtralHtml,
      gemmaHtml,
      phiHtml,
      falconHtml,
      optHtml,
      olmoHtml,
    ]) {
      expect(html).toContain('data-testid="model-at-a-glance"');
      expect(html).toContain('data-testid="model-module-list"');
      expect(html).toContain(
        "Structured training-regime details are not available yet.",
      );
      expect(html).toContain(
        "Structured dataset details are not available yet.",
      );
      expect(html).toContain("Structured paper links are not available yet.");
    }

    expect(mistralHtml).toContain("/docs/models/mixtral");
    expect(mistralHtml).toContain("/docs/models/decoder-only-models");
    expect(mixtralHtml).toContain("/docs/models/mistral");
    expect(mixtralHtml).toContain("/docs/glossary/mixture-of-experts");
    expect(gemmaHtml).toContain("/docs/models/gemini");
    expect(gemmaHtml).toContain("/docs/models/decoder-only-models");
    expect(phiHtml).toContain("/docs/models/autoregressive-models");
    expect(falconHtml).toContain("/docs/glossary/autoregressive-generation");
    expect(optHtml).toContain("/docs/models/gpt-2");
    expect(olmoHtml).toContain("/docs/models/autoregressive-models");
  });
});

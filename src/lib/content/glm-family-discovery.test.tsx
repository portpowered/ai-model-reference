import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";
import { assertCanonicalPageLevelApiResults } from "@/lib/verify/phase-1-search-checks";
import { resultsIncludeUrl } from "@/tests/search/helpers";

const GLM5_URL = "/docs/models/glm-5";
const GLM52_URL = "/docs/models/glm-5-2";

async function renderModelPageHtml(slug: "glm-5" | "glm-5-2") {
  const page = await loadModelPage(slug);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("GLM family discovery (glm-5-and-5-2-model-pages-004)", () => {
  test.each([
    "GLM-5",
    "GlmMoeDsa",
    "glm-5",
  ] as const)("search for %s returns the canonical GLM-5 model page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeUrl(results, GLM5_URL)).toBe(true);
    expect(results[0]?.url).toBe(GLM5_URL);
  });

  test.each([
    "GLM-5.2",
    "glm-5-2",
  ] as const)("search for %s returns the canonical GLM-5.2 model page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeUrl(results, GLM52_URL)).toBe(true);
    expect(results[0]?.url).toBe(GLM52_URL);
  });

  test("model-family tag landing lists both GLM model pages", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "model-family" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('href="/docs/models/glm-5"');
    expect(html).toContain('href="/docs/models/glm-5-2"');
    expect(html).toContain("GLM-5");
    expect(html).toContain("GLM-5.2");
  });

  test("attention tag landing lists both GLM model pages", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "attention" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('href="/docs/models/glm-5"');
    expect(html).toContain('href="/docs/models/glm-5-2"');
  });

  test("GLM-5 page exposes clickable tags and one-click GLM-5.2 navigation", async () => {
    const html = await renderModelPageHtml("glm-5");

    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/context-window"');
    expect(html).toContain('href="/docs/models/glm-5-2"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain("Planned related doc");
  });

  test("GLM-5.2 page exposes clickable tags and one-click GLM-5 navigation", async () => {
    const html = await renderModelPageHtml("glm-5-2");

    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/context-window"');
    expect(html).toContain('href="/docs/models/glm-5"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain("Planned related doc");
  });

  test("derived related docs surface same-model-family sibling links on both pages", async () => {
    const glm5Derived = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="model.glm-5"
        groups={["same-model-family", "curated-related"]}
      />,
    );
    const glm52Derived = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="model.glm-5-2"
        groups={["same-model-family", "curated-related"]}
      />,
    );

    expect(glm5Derived).toContain('href="/docs/models/glm-5-2"');
    expect(glm52Derived).toContain('href="/docs/models/glm-5"');
  });

  test("tag resource groups include both GLM models under model-family", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("model-family", messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup).toBeDefined();
    expect(
      modelGroup?.resources.some((resource) => resource.url === GLM5_URL),
    ).toBe(true);
    expect(
      modelGroup?.resources.some((resource) => resource.url === GLM52_URL),
    ).toBe(true);
  });
});

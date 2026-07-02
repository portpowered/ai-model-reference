import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { loadModelPage } from "@/lib/content/model-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getModelById,
  getModuleById,
  getRegistryRecordById,
  getSystemById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";
import { resultsIncludeUrl } from "@/tests/search/helpers";

const MIXTRAL_8X7B_MODEL_ID = "model.mixtral-8x7b";
const MIXTRAL_8X22B_MODEL_ID = "model.mixtral-8x22b";
const MIXTRAL_8X7B_URL = "/docs/models/mixtral-8x7b";
const MIXTRAL_8X22B_URL = "/docs/models/mixtral-8x22b";

async function renderModelPageHtml(slug: "mixtral-8x7b" | "mixtral-8x22b") {
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

describe("Mixtral MoE paired slice discovery", () => {
  test("registry cross-links both Mixtral releases through relatedIds and shared Mistral family metadata", () => {
    const mixtral8x7b = getModelById(MIXTRAL_8X7B_MODEL_ID);
    const mixtral8x22b = getModelById(MIXTRAL_8X22B_MODEL_ID);

    expect(mixtral8x7b?.family).toBe("mistral");
    expect(mixtral8x22b?.family).toBe("mistral");
    expect(mixtral8x7b?.relatedIds).toContain(MIXTRAL_8X22B_MODEL_ID);
    expect(mixtral8x22b?.relatedIds).toContain(MIXTRAL_8X7B_MODEL_ID);
    expect(mixtral8x7b?.aliases).toEqual(["Mixtral 8x7B", "open-mixtral-8x7b"]);
    expect(mixtral8x22b?.aliases).toEqual([
      "Mixtral 8x22B",
      "open-mixtral-8x22b",
    ]);
  });

  test("model records expose explicit mixture-of-experts and routing relationships for module and system derivation", () => {
    const mixtral8x7b = getModelById(MIXTRAL_8X7B_MODEL_ID);
    const mixtral8x22b = getModelById(MIXTRAL_8X22B_MODEL_ID);

    for (const model of [mixtral8x7b, mixtral8x22b]) {
      expect(model?.moduleIds).toContain("module.mixture-of-experts");
      expect(model?.relatedIds).toContain("module.mixture-of-experts");
      expect(model?.relatedIds).toContain("concept.mixture-of-experts");
      expect(model?.relatedIds).toContain("system.routing");
      expect(model?.architectureIds).toContain("concept.mixture-of-experts");
    }

    expect(getModuleById("module.mixture-of-experts")?.usedByModelIds).toEqual(
      expect.arrayContaining([MIXTRAL_8X7B_MODEL_ID, MIXTRAL_8X22B_MODEL_ID]),
    );
    expect(getSystemById("system.routing")?.relatedModelIds).toEqual(
      expect.arrayContaining([MIXTRAL_8X7B_MODEL_ID, MIXTRAL_8X22B_MODEL_ID]),
    );
  });

  test("curated related items resolve sibling Mixtral pages plus MoE, routing, and attention paths", () => {
    for (const [sourceId, siblingId, siblingUrl] of [
      [MIXTRAL_8X7B_MODEL_ID, MIXTRAL_8X22B_MODEL_ID, MIXTRAL_8X22B_URL],
      [MIXTRAL_8X22B_MODEL_ID, MIXTRAL_8X7B_MODEL_ID, MIXTRAL_8X7B_URL],
    ] as const) {
      const source = getRegistryRecordById(sourceId);
      if (source?.kind !== "model") {
        throw new Error(`expected ${sourceId} in registry runtime`);
      }

      const items = deriveCuratedRelatedItems(
        source,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      expect(items.find((item) => item.registryId === siblingId)?.href).toBe(
        siblingUrl,
      );
      expect(
        items.some((item) => item.href === "/docs/modules/mixture-of-experts"),
      ).toBe(true);
      expect(
        items.find((item) => item.registryId === "system.routing")?.href,
      ).toBe("/docs/systems/routing");
      expect(
        items.find((item) => item.registryId === "module.attention")?.href,
      ).toBe("/docs/modules/attention");
    }
  });

  test("DerivedRelatedDocs and RelatedDocs surface sibling Mixtral navigation on both pages", () => {
    const mixtral8x7bDerived = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId={MIXTRAL_8X7B_MODEL_ID}
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );
    const mixtral8x22bDerived = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId={MIXTRAL_8X22B_MODEL_ID}
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );
    const mixtral8x7bRelated = renderToStaticMarkup(
      <RelatedDocs registryId={MIXTRAL_8X7B_MODEL_ID} />,
    );
    const mixtral8x22bRelated = renderToStaticMarkup(
      <RelatedDocs registryId={MIXTRAL_8X22B_MODEL_ID} />,
    );

    expect(mixtral8x7bDerived).toContain(`href="${MIXTRAL_8X22B_URL}"`);
    expect(mixtral8x22bDerived).toContain(`href="${MIXTRAL_8X7B_URL}"`);
    expect(mixtral8x7bRelated).toContain(`href="${MIXTRAL_8X22B_URL}"`);
    expect(mixtral8x22bRelated).toContain(`href="${MIXTRAL_8X7B_URL}"`);
    expect(mixtral8x7bRelated).toContain(
      'href="/docs/modules/mixture-of-experts"',
    );
    expect(mixtral8x22bRelated).toContain('href="/docs/systems/routing"');
  });

  test("rendered model pages expose one-click sibling navigation, architecture graphs, and citations", async () => {
    const mixtral8x7bHtml = await renderModelPageHtml("mixtral-8x7b");
    const mixtral8x22bHtml = await renderModelPageHtml("mixtral-8x22b");

    expect(mixtral8x7bHtml).toContain(`href="${MIXTRAL_8X22B_URL}"`);
    expect(mixtral8x22bHtml).toContain(`href="${MIXTRAL_8X7B_URL}"`);
    expect(mixtral8x7bHtml).toContain('data-testid="derived-related-docs"');
    expect(mixtral8x22bHtml).toContain('data-testid="derived-related-docs"');
    expect(mixtral8x7bHtml).toContain('data-page-asset="architectureGraph"');
    expect(mixtral8x22bHtml).toContain('data-page-asset="architectureGraph"');
    expect(mixtral8x7bHtml).toContain('data-testid="citation-list"');
    expect(mixtral8x22bHtml).toContain('data-testid="citation-list"');
    expect(mixtral8x7bHtml).not.toContain("Planned related doc");
    expect(mixtral8x22bHtml).not.toContain("Planned related doc");
  });

  test.each([
    "model-family",
    "attention",
    "feed-forward",
    "context-window",
  ] as const)("%s tag landing surfaces both Mixtral model entry points", async (slug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(slug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup?.resources.map((resource) => resource.url)).toEqual(
      expect.arrayContaining([MIXTRAL_8X7B_URL, MIXTRAL_8X22B_URL]),
    );
  });

  test("attention tag landing renders both Mixtral models without empty-state placeholders", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "attention" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain(`href="${MIXTRAL_8X7B_URL}"`);
    expect(html).toContain(`href="${MIXTRAL_8X22B_URL}"`);
    expect(html).not.toContain("No resources");
    expect(html).not.toContain("Nothing has shipped");
  });

  test.each([
    ["Mixtral 8x7B", MIXTRAL_8X7B_URL],
    ["Mixtral 8x22B", MIXTRAL_8X22B_URL],
    ["open-mixtral-8x7b", MIXTRAL_8X7B_URL],
    ["open-mixtral-8x22b", MIXTRAL_8X22B_URL],
    ["Mixtral", MIXTRAL_8X7B_URL],
  ] as const)("search query %s resolves to %s through the normal discovery path", async (query, expectedUrl) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, expectedUrl)).toBe(true);
  });

  test("Mixtral comparison search returns both releases for a paired MoE query", async () => {
    const results = await docsSearchApi.search("Mixtral 8x7B 8x22B");

    expect(resultsIncludeUrl(results, MIXTRAL_8X7B_URL)).toBe(true);
    expect(resultsIncludeUrl(results, MIXTRAL_8X22B_URL)).toBe(true);
  });
});

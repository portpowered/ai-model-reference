import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getModelById,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";

const DENSE_MODEL_ID = "model.qwen-3-6-27b";
const MOE_MODEL_ID = "model.qwen-3-6-35b-a3b";
const DENSE_MODEL_URL = "/docs/models/qwen-3-6-27b";
const MOE_MODEL_URL = "/docs/models/qwen-3-6-35b-a3b";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

function resultsIncludeUrl(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

describe("Qwen 3.6 dense and MoE discovery paths", () => {
  test("registry cross-links the dense and MoE operating points through relatedIds", () => {
    const dense = getModelById(DENSE_MODEL_ID);
    const moe = getModelById(MOE_MODEL_ID);

    expect(dense?.relatedIds).toContain(MOE_MODEL_ID);
    expect(moe?.relatedIds).toContain(DENSE_MODEL_ID);
  });

  test("dense curated related items resolve to transformer, context, attention, and inference paths", () => {
    const source = getRegistryRecordById(DENSE_MODEL_ID);
    if (source?.kind !== "model") {
      throw new Error("expected dense Qwen 3.6 model in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.find((item) => item.registryId === MOE_MODEL_ID)?.href).toBe(
      MOE_MODEL_URL,
    );
    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "concept.context-window")?.href,
    ).toBe("/docs/glossary/context-window");
    expect(
      items.find((item) => item.registryId === "concept.transformer")?.href,
    ).toBe("/docs/glossary/transformer");
    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
  });

  test("MoE curated related items resolve to mixture-of-experts, routing, and shared prerequisite paths", () => {
    const source = getRegistryRecordById(MOE_MODEL_ID);
    if (source?.kind !== "model") {
      throw new Error("expected MoE Qwen 3.6 model in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.find((item) => item.registryId === DENSE_MODEL_ID)?.href).toBe(
      DENSE_MODEL_URL,
    );
    expect(
      items.some((item) => item.href === "/docs/modules/mixture-of-experts"),
    ).toBe(true);
    expect(
      items.find((item) => item.registryId === "system.routing")?.href,
    ).toBe("/docs/systems/routing");
    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
  });

  test("DerivedRelatedDocs surfaces the paired Qwen 3.6 operating point through curated-related", () => {
    const denseHtml = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId={DENSE_MODEL_ID}
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );
    const moeHtml = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId={MOE_MODEL_ID}
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );

    expect(denseHtml).toContain(`href="${MOE_MODEL_URL}"`);
    expect(moeHtml).toContain(`href="${DENSE_MODEL_URL}"`);
    expect(denseHtml).toContain('data-related-group="curated-related"');
    expect(moeHtml).toContain('data-related-group="curated-related"');
  });

  test("RelatedDocs renders registry-backed curated discovery links on both model pages", () => {
    const denseHtml = renderToStaticMarkup(
      <RelatedDocs registryId={DENSE_MODEL_ID} />,
    );
    const moeHtml = renderToStaticMarkup(
      <RelatedDocs registryId={MOE_MODEL_ID} />,
    );

    expect(denseHtml).toContain('data-testid="curated-related-docs"');
    expect(moeHtml).toContain('data-testid="curated-related-docs"');
    expect(denseHtml).toContain(`href="${MOE_MODEL_URL}"`);
    expect(moeHtml).toContain(`href="${DENSE_MODEL_URL}"`);
    expect(moeHtml).toContain('href="/docs/modules/mixture-of-experts"');
    expect(moeHtml).toContain('href="/docs/systems/routing"');
    expect(denseHtml).toContain('href="/docs/modules/attention"');
    expect(denseHtml).toContain('href="/docs/systems/inference-engine"');
  });

  test("context-window tag landing surfaces both Qwen 3.6 model entry points", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      "context-window",
      messages,
      "en",
    );
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup?.resources.map((resource) => resource.url)).toEqual(
      expect.arrayContaining([DENSE_MODEL_URL, MOE_MODEL_URL]),
    );
  });

  test("model-family tag landing surfaces both Qwen 3.6 model entry points", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("model-family", messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup?.resources.map((resource) => resource.url)).toEqual(
      expect.arrayContaining([DENSE_MODEL_URL, MOE_MODEL_URL]),
    );
  });

  test("attention tag landing surfaces both Qwen 3.6 model entry points", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("attention", messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup?.resources.map((resource) => resource.url)).toEqual(
      expect.arrayContaining([DENSE_MODEL_URL, MOE_MODEL_URL]),
    );
  });

  test("feed-forward tag landing surfaces the MoE Qwen 3.6 model entry point", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("feed-forward", messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(
      modelGroup?.resources.some((resource) => resource.url === MOE_MODEL_URL),
    ).toBe(true);
  });

  test("context-window tag landing renders both Qwen 3.6 models without empty-state placeholders", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "context-window" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain(`href="${DENSE_MODEL_URL}"`);
    expect(html).toContain(`href="${MOE_MODEL_URL}"`);
    expect(html).not.toContain("No resources");
    expect(html).not.toContain("Nothing has shipped");
  });

  test.each([
    ["Qwen3.6-27B", DENSE_MODEL_URL],
    ["Qwen 3.6 27B", DENSE_MODEL_URL],
    ["Qwen3.6-35B-A3B", MOE_MODEL_URL],
    ["Qwen 3.6 35B A3B", MOE_MODEL_URL],
    ["Qwen 3.6 dense", DENSE_MODEL_URL],
    ["Qwen 3.6 MoE", MOE_MODEL_URL],
    ["Qwen 3.6 dense vs MoE", DENSE_MODEL_URL],
  ] as const)("search query %s resolves to %s through the normal discovery path", async (query, expectedUrl) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, expectedUrl)).toBe(true);
  });

  test("dense vs MoE comparison search returns both Qwen 3.6 operating points", async () => {
    const results = await docsSearchApi.search("Qwen 3.6 dense MoE");

    expect(resultsIncludeUrl(results, DENSE_MODEL_URL)).toBe(true);
    expect(resultsIncludeUrl(results, MOE_MODEL_URL)).toBe(true);
  });
});

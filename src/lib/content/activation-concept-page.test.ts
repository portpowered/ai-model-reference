import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

describe("Activation concept page (activation-concept-page-001)", () => {
  test("registry record stays published and is listed as a concept-section docs page", () => {
    const record = getConceptById("concept.activation");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.aliases).toEqual([
      "activations",
      "activation function",
      "hidden activation",
      "layer output",
    ]);
    expect(record?.tags).toEqual([
      "activation",
      "token-to-probability-chain",
      "foundations",
    ]);
    expect(record?.relatedIds).toEqual([
      "module.feed-forward-network",
      "module.relu",
      "module.leaky-relu",
      "module.silu",
      "module.swiglu",
      "concept.computational-graph",
      "concept.quantization",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.activation")).toBe(true);
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.activation"),
    ).toBe(true);
  });

  test("curated related links resolve to the nearby activation and feed-forward pages", () => {
    const source = getConceptById("concept.activation");
    if (!source) {
      throw new Error("expected concept.activation in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.feed-forward-network")
        ?.href,
    ).toBe("/docs/modules/feed-forward-network");
    expect(items.find((item) => item.registryId === "module.relu")?.href).toBe(
      "/docs/modules/relu",
    );
    expect(
      items.find((item) => item.registryId === "module.leaky-relu")?.href,
    ).toBe("/docs/modules/leaky-relu");
    expect(items.find((item) => item.registryId === "module.silu")?.href).toBe(
      "/docs/modules/silu",
    );
    expect(
      items.find((item) => item.registryId === "module.swiglu")?.href,
    ).toBe("/docs/modules/swiglu");
  });

  test("page renders the plain-language explanation and nearby activation links", async () => {
    const page = await loadConceptPage("activation");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.activation");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("nonlinear");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why Nonlinear Steps Matter");
    expect(html).toContain("Read Next");
    expect(html).toContain("output softmax");
    expect(html).toContain('href="/docs/concepts/activation"');
    expect(html).toContain('href="/docs/glossary/activation"');
    expect(html).toContain('href="/docs/glossary/parameter"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain('href="/docs/modules/feed-forward-network"');
    expect(html).toContain('href="/docs/modules/relu"');
    expect(html).toContain('href="/docs/modules/leaky-relu"');
    expect(html).toContain('href="/docs/modules/silu"');
    expect(html).toContain('href="/docs/modules/swiglu"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents and live search return the canonical activation concept page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const activationDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/activation",
    );
    expect(activationDocument?.aliases).toEqual(
      expect.arrayContaining([
        "activations",
        "activation function",
        "hidden activation",
        "layer output",
        "activation layer",
      ]),
    );
    expect(activationDocument?.tags).toEqual(
      expect.arrayContaining(["activation", "foundations"]),
    );
    expect(activationDocument?.bodyText).toContain("output softmax");
    expect(activationDocument?.bodyText).toContain("feed-forward networks");

    expect(
      (await docsSearchApi.search("activation function")).some(
        (result) => result.url === "/docs/concepts/activation",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("hidden activation")).some(
        (result) => result.url === "/docs/concepts/activation",
      ),
    ).toBe(true);
    expect(
      (await docsSearchApi.search("layer output")).some(
        (result) => result.url === "/docs/concepts/activation",
      ),
    ).toBe(true);
  });
});

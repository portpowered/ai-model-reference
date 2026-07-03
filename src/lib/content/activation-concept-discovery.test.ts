import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

const DISCOVERY_HREFS = [
  "/docs/glossary/activation",
  "/docs/modules/relu",
  "/docs/modules/leaky-relu",
  "/docs/modules/silu",
  "/docs/modules/swiglu",
  "/docs/modules/feed-forward-network",
] as const;

describe("Activation concept page discovery (activation-concept-current-main-page-003)", () => {
  test("registry record exposes curated related ids for the activation family and feed-forward network", () => {
    const record = getConceptById("concept.activation");
    expect(record?.status).toBe("published");
    expect(record?.relatedIds).toEqual([
      "module.feed-forward-network",
      "module.relu",
      "module.leaky-relu",
      "module.silu",
      "module.swiglu",
      "concept.computational-graph",
    ]);
  });

  test("curated related links resolve to published module pages and computational graph", () => {
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
    expect(
      items.find((item) => item.registryId === "concept.computational-graph")
        ?.href,
    ).toBe("/docs/glossary/computational-graph");
  });

  test("page renders inline and registry-backed links to nearby activation docs", async () => {
    const page = await loadConceptPage("activation");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.activation");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    for (const href of DISCOVERY_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }

    expect(html).toContain('href="/docs/glossary/computational-graph"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });
});

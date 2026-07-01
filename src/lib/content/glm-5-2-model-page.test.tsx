import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { DocsOpeningSummary } from "@/features/docs/components/DocsOpeningSummary";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadModelPage } from "@/lib/content/model-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getModelById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("GLM-5.2 model page (glm-5-and-5-2-model-pages-003)", () => {
  test("registry record is published with GLM family metadata and GLM-5 cross-link", () => {
    const record = getModelById("model.glm-5-2");

    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("glm-5-2");
    expect(record?.family).toBe("glm");
    expect(record?.releaseDate).toBe("2026-06-17");
    expect(record?.contextLength).toBe(1048576);
    expect(record?.parameterCount).toBe("744 billion total parameters");
    expect(record?.activeParameterCount).toBe("40 billion active parameters");
    expect(record?.relatedIds).toContain("model.glm-5");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("model.glm-5-2")).toBe(true);
  });

  test("curated related docs include the paired GLM-5 model record", () => {
    const source = getModelById("model.glm-5-2");
    if (!source) {
      throw new Error("expected model.glm-5-2 in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "model.glm-5"),
    ).toBeDefined();
  });

  test("page renders title, folded opening summary, references, and GLM-5 link", async () => {
    const page = await loadModelPage("glm-5-2");

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("model.glm-5-2");
    expect(page.messages.title).toBe("GLM-5.2");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "long-horizon",
    );

    const shellHtml = renderToStaticMarkup(
      createElement(DocsOpeningSummary, {
        text: page.messages.openingSummary ?? "",
      }),
    );
    expect(shellHtml).toContain('data-opening-summary="folded"');
    expect(shellHtml).toContain('data-testid="folded-summary"');

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('id="references"');
    expect(html).toContain("744 billion total parameters");
    expect(html).not.toContain("753");
    expect(html).toContain('href="/docs/models/glm-5"');
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain('data-graph-id="graph.glm-5-2-architecture"');
  });

  test("derived related docs surface shared modules without duplicating curated GLM links", async () => {
    const page = await loadModelPage("glm-5-2");
    const derivedHtml = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="model.glm-5-2"
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );
    const fullHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(derivedHtml).toContain('href="/docs/modules/sparse-attention"');
    expect(fullHtml).toContain('data-testid="derived-related-docs"');
  });

  test("local docs route loads published GLM-5.2 bundle", async () => {
    const page = await loadLocalDocsPage({
      section: "models",
      slug: "glm-5-2",
    });

    expect(page.messages.title).toBe("GLM-5.2");
    expect(page.frontmatter.registryId).toBe("model.glm-5-2");
  });
});

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
import { buildLocalizedRoute } from "@/lib/i18n/locale-routing";

describe("RoPE concept page", () => {
  test("publishes the canonical concept record with reader-facing aliases", () => {
    const record = getConceptById("concept.rope");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("rope");
    expect(record?.aliases).toContain("RoPE");
    expect(record?.aliases).toContain("rotary position encoding");
    expect(record?.tags).toEqual(["position-encoding", "foundations"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.rope")).toBe(true);
  });

  test("curated related docs resolve to the concept hub, nearby comparisons, and the existing module page", () => {
    const record = getConceptById("concept.rope");
    if (!record) {
      throw new Error("expected concept.rope in registry");
    }

    const items = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.positional-encodings")
        ?.href,
    ).toBe("/docs/concepts/positional-encodings");
    expect(
      items.find((item) => item.registryId === "concept.relative-position-bias")
        ?.href,
    ).toBe("/docs/modules/relative-position-bias");
    expect(
      items.find((item) => item.registryId === "concept.alibi")?.href,
    ).toBe("/docs/modules/alibi");
    expect(
      items.find((item) => item.registryId === "concept.ntk-aware-rope-scaling")
        ?.href,
    ).toBe("/docs/modules/ntk-aware-rope-scaling");
    expect(
      items.find((item) => item.registryId === "concept.longrope")?.href,
    ).toBe("/docs/modules/longrope");
  });

  test("loads and renders at the canonical concept route with plain-language sections", async () => {
    expect(
      buildLocalizedRoute(
        { surface: "docs-page", slug: "concepts/rope" },
        "en",
      ),
    ).toBe("/docs/concepts/rope");

    const page = await loadConceptPage("rope");
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.registryId).toBe("concept.rope");
    expect(page.frontmatter.status).toBe("published");
    expect(page.messages.title).toBe("Rotary position encoding");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("decoder");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("How The Rotation Helps");
    expect(html).toContain("rotates paired query and key features");
    expect(html).toContain("older absolute positional");
    expect(html).toContain('href="/docs/concepts/positional-encodings"');
    expect(html).toContain('href="/docs/modules/relative-position-bias"');
    expect(html).toContain('href="/docs/modules/alibi"');
    expect(html).toContain('href="/docs/modules/ntk-aware-rope-scaling"');
    expect(html).toContain('href="/docs/modules/longrope"');
    expect(html).toContain('href="/docs/modules/rope"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });
});

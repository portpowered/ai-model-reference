import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { getConceptById } from "@/lib/content/registry-runtime";

describe("Cross-attention concept page", () => {
  test("registry record is published and listed as a published docs page", () => {
    const record = getConceptById("concept.cross-attention");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("cross-attention");
    expect(record?.conceptType).toBe("general");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.cross-attention")).toBe(
      true,
    );
  });

  test("page resolves the canonical concept route without missing-content placeholders", async () => {
    const page = await loadConceptPage("cross-attention");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.cross-attention");
    expect(page.messages.title).toBe("Cross-Attention");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "cross-attention",
    );

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
    expect(html).toContain("Simple Example");
    expect(html).toContain("Common Confusions");
    expect(html).toContain("bridge between two representations");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("TODO");
  });
});

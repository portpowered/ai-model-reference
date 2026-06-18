import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("Phase 3 NoPE glossary page (US-004)", () => {
  test("registry record publishes NoPE as a canonical positional-choice page", () => {
    const nope = getConceptById("concept.nope");

    expect(nope?.status).toBe("published");
    expect(nope?.kind).toBe("concept");
    expect(nope?.aliases).toEqual([
      "NoPE",
      "no positional encoding",
      "no positional embeddings",
    ]);
    expect(nope?.relatedIds).toEqual([
      "concept.positional-encodings",
      "concept.absolute-positional-embeddings",
      "concept.rope",
      "concept.alibi",
    ]);
    expect(nope?.prerequisiteIds).toEqual(["concept.positional-encodings"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.nope")).toBe(true);
  });

  test("curated related links expose positional encodings, absolute embeddings, RoPE, and ALiBi", () => {
    const nope = getConceptById("concept.nope");
    if (!nope) {
      throw new Error("expected concept.nope in registry");
    }

    const items = deriveCuratedRelatedItems(
      nope,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.positional-encodings")
        ?.href,
    ).toBe("/docs/concepts/positional-encodings");
    expect(
      items.find(
        (item) => item.registryId === "concept.absolute-positional-embeddings",
      )?.href,
    ).toBe("/docs/glossary/absolute-positional-embeddings");
    expect(items.find((item) => item.registryId === "concept.rope")?.href).toBe(
      "/docs/glossary/rope",
    );
    expect(
      items.find((item) => item.registryId === "concept.alibi")?.href,
    ).toBe("/docs/glossary/alibi");
  });

  test("page render explains NoPE as an unusual baseline rather than long-context support", async () => {
    const page = await loadGlossaryPage("nope");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.nope");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain(
      "the model does not add a dedicated position table, rotary angle",
    );
    expect(html).toContain(
      "does not mean better long-context support. It usually names an ablation",
    );
    expect(html).toContain("causal masking and training order still exist");
    expect(html).toContain('href="/docs/concepts/positional-encodings"');
    expect(html).toContain(
      'href="/docs/glossary/absolute-positional-embeddings"',
    );
    expect(html).toContain('href="/docs/glossary/rope"');
    expect(html).toContain('href="/docs/glossary/alibi"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });
});

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

describe("Phase 3 positional encodings concept page (US-008)", () => {
  test("registry record is published with explainsIds and curated related ids", () => {
    const record = getConceptById("concept.positional-encodings");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.explainsIds).toEqual([
      "concept.rope",
      "concept.alibi",
      "concept.absolute-positional-embeddings",
      "concept.learned-positional-embeddings",
      "concept.sinusoidal-positional-embeddings",
      "concept.relative-position-bias",
      "concept.t5-relative-position-bias",
      "concept.nope",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "module.attention",
      "concept.rope",
      "concept.alibi",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.positional-encodings"),
    ).toBe(true);
  });

  test("curated related links transformer architecture and attention with navigable RoPE and ALiBi", () => {
    const source = getConceptById("concept.positional-encodings");
    if (!source) {
      throw new Error("expected concept.positional-encodings in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const architecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(architecture?.href).toBe("/docs/concepts/transformer-architecture");
    expect(architecture?.isPlanned).toBe(false);

    const attention = items.find(
      (item) => item.registryId === "module.attention",
    );
    expect(attention?.href).toBe("/docs/modules/attention");
    expect(attention?.isPlanned).toBe(false);

    const rope = items.find((item) => item.registryId === "concept.rope");
    expect(rope?.href).toBe("/docs/glossary/rope");
    expect(rope?.isPlanned).toBe(false);
    expect(rope?.title).toBe("RoPE");

    const alibi = items.find((item) => item.registryId === "concept.alibi");
    expect(alibi?.href).toBe("/docs/glossary/alibi");
    expect(alibi?.isPlanned).toBe(false);
    expect(alibi?.title).toBe("ALiBi");
  });

  test("page renders title, sections, opening summary, and forward references to RoPE and ALiBi", async () => {
    const page = await loadConceptPage("positional-encodings");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.positional-encodings");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain("unordered");

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
    expect(html).toContain("built-in order");
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/glossary/rope"');
    expect(html).toContain('href="/docs/glossary/alibi"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });
});

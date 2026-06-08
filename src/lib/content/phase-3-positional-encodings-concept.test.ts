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
import {
  deriveCuratedRelatedItems,
  PLANNED_RELATED_REASON_LABEL,
} from "@/lib/content/related-docs";

const PLANNED_POSITION_VARIANT_IDS = ["concept.rope", "concept.alibi"] as const;

describe("Phase 3 positional encodings concept page (US-008)", () => {
  test("registry record is published with explainsIds and curated related ids", () => {
    const record = getConceptById("concept.positional-encodings");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.explainsIds).toEqual(["concept.rope", "concept.alibi"]);
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

  test("curated related links transformer architecture and attention with RoPE and ALiBi planned", () => {
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

    const plannedVariants = items.filter((item) =>
      PLANNED_POSITION_VARIANT_IDS.includes(
        item.registryId as (typeof PLANNED_POSITION_VARIANT_IDS)[number],
      ),
    );
    expect(plannedVariants).toHaveLength(2);
    for (const item of plannedVariants) {
      expect(item.isPlanned).toBe(true);
      expect(item.href).toBeUndefined();
      expect(item.reasonLabel).toBe(PLANNED_RELATED_REASON_LABEL);
    }

    const rope = plannedVariants.find(
      (item) => item.registryId === "concept.rope",
    );
    expect(rope?.title).toBe("RoPE");

    const alibi = plannedVariants.find(
      (item) => item.registryId === "concept.alibi",
    );
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
    expect(html).toContain("RoPE");
    expect(html).toContain("ALiBi");
    expect(html).toContain(PLANNED_RELATED_REASON_LABEL);
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });
});

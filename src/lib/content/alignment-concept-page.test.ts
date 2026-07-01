import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { getConceptById } from "@/lib/content/registry-runtime";

describe("alignment concept page (alignment-concept-page-001)", () => {
  test("registry record and published docs entry resolve the concepts route", () => {
    const record = getConceptById("concept.alignment");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.alignment")).toBe(true);

    const entry = getPublishedDocsEntryByRegistryId("concept.alignment");
    expect(entry?.pageKind).toBe("concept");
    expect(entry?.section).toBe("concepts");
    expect(entry?.docsSlug).toBe("concepts/alignment");
  });

  test("page renders isolation-first alignment summary and standard concept sections", async () => {
    const page = await loadConceptPage("alignment");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.alignment");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("pretrained");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("preference");

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
    expect(html).toContain("helpful");
    expect(html).toContain("pretraining");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});

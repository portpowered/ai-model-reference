import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";

describe("Relative position bias concept page (US-001)", () => {
  test("canonical route, frontmatter, and default English messages resolve together", async () => {
    const route = localDocsRoute({
      section: "concepts",
      slug: "relative-position-bias",
    });
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "relative-position-bias",
    });
    const messages = pageMessagesSchema.parse(page.messages);

    expect(route).toBe("/docs/concepts/relative-position-bias");
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.registryId).toBe("concept.relative-position-bias");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.frontmatter.status).toBe("published");
    expect(messages.title).toBe("Relative position bias");
    expect(messages.description).toContain(
      "token distance or relative position",
    );
    expect(messages.openingSummary).toContain("broad family");
    expect(page.toc.map((item) => item.url)).toEqual([
      "#what-it-is",
      "#why-it-matters",
      "#simple-example",
      "#common-confusions",
      "#related",
      "#tags",
      "#references",
    ]);
  });

  test("registry record is published and included in published docs ids", () => {
    const record = getConceptById("concept.relative-position-bias");
    expect(record?.status).toBe("published");
    expect(record?.prerequisiteIds).toEqual(["concept.positional-encodings"]);
    expect(record?.explainsIds).toEqual(["concept.t5-relative-position-bias"]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.relative-position-bias"),
    ).toBe(true);
  });

  test("curated related links resolve positional encodings and module-backed family pages", () => {
    const source = getConceptById("concept.relative-position-bias");
    if (!source) {
      throw new Error("expected concept.relative-position-bias in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const positionalEncodings = items.find(
      (item) => item.registryId === "concept.positional-encodings",
    );
    expect(positionalEncodings?.href).toBe(
      "/docs/concepts/positional-encodings",
    );
    expect(positionalEncodings?.isPlanned).toBe(false);

    const absolute = items.find(
      (item) => item.registryId === "concept.absolute-positional-embeddings",
    );
    expect(absolute?.href).toBe("/docs/modules/absolute-positional-embeddings");
    expect(absolute?.isPlanned).toBe(false);

    const t5Bias = items.find(
      (item) => item.registryId === "concept.t5-relative-position-bias",
    );
    expect(t5Bias?.href).toBe("/docs/modules/t5-relative-position-bias");
    expect(t5Bias?.isPlanned).toBe(false);

    const rope = items.find((item) => item.registryId === "concept.rope");
    expect(rope?.href).toBe("/docs/modules/rope");
    expect(rope?.isPlanned).toBe(false);

    const alibi = items.find((item) => item.registryId === "concept.alibi");
    expect(alibi?.href).toBe("/docs/modules/alibi");
    expect(alibi?.isPlanned).toBe(false);
  });

  test("page renders title, sections, tags, related docs, and references without placeholders", async () => {
    const page = await loadConceptPage("relative-position-bias");
    expect(page.frontmatter.registryId).toBe("concept.relative-position-bias");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

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
    expect(html).toContain("learned or designed offset");
    expect(html).toContain("Shaw, Peter");
    expect(html).toContain('href="/docs/concepts/positional-encodings"');
    expect(html).toContain('href="/docs/modules/t5-relative-position-bias"');
    expect(html).toContain('href="/docs/modules/rope"');
    expect(html).toContain('href="/docs/modules/alibi"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain("Related Concepts And Modules");
    expect(html).toContain("References");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("concept page copy explains the family in plain language and contrasts nearby methods (US-002)", async () => {
    const page = await loadConceptPage("relative-position-bias");
    const messages = pageMessagesSchema.parse(page.messages);

    expect(messages.description).toContain("attention scores");
    expect(messages.description).toContain(
      "token distance or relative position",
    );
    expect(messages.openingSummary).toContain("broad family");
    expect(messages.openingSummary).toContain("absolute positional embeddings");
    expect(messages.openingSummary).toContain("T5");
    expect(messages.openingSummary).toContain("ALiBi");
    expect(messages.openingSummary).toContain(
      "rotary position embedding (RoPE)",
    );

    expect(messages.sections?.whatItIs.body).toContain("family idea first");
    expect(messages.sections?.whatItIs.body).toContain(
      "query-key attention score",
    );
    expect(messages.sections?.whyItMatters.body).toContain("word order");
    expect(messages.sections?.whyItMatters.body).toContain("Locality");
    expect(messages.sections?.whyItMatters.body).toContain("Repeated patterns");
    expect(messages.sections?.whyItMatters.body).toContain(
      "Absolute positional embeddings",
    );
    expect(messages.sections?.whyItMatters.body).toContain(
      "fixed index-specific vector",
    );
    expect(messages.sections?.simpleExample.body).toContain(
      "pattern repeats later in the text",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "T5 relative position bias is a bucketed subtype",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "ALiBi is a simpler member",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "Rotary position embedding (RoPE) sits nearby but works differently",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "Absolute positional embeddings solve token order yet another way",
    );

    const record = getConceptById("concept.relative-position-bias");
    expect(record?.citationIds).toEqual([
      "citation.self-attention-with-relative-position-representations",
    ]);
  });
});

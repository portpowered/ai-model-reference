import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { loadModulePage } from "@/lib/content/module-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  deriveCuratedRelatedItems,
  deriveSameVariantGroupPeers,
} from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";

describe("Phase 3 relative bias family pages (US-003)", () => {
  test("canonical route, frontmatter, and default English messages resolve together for relative position bias", async () => {
    const route = localDocsRoute({
      section: "modules",
      slug: "relative-position-bias",
    });
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: "relative-position-bias",
    });
    const messages = pageMessagesSchema.parse(page.messages);

    expect(route).toBe("/docs/modules/relative-position-bias");
    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.registryId).toBe("module.relative-position-bias");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.frontmatter.status).toBe("published");
    expect(messages.title).toBe("Relative position bias");
    expect(messages.description).toContain("distance-aware bias terms");
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

  test("relative position bias distinguishes the general family from the T5-specific subtype", () => {
    const relativeBias = getConceptById("concept.relative-position-bias");
    const relativeBiasModule = getModuleById("module.relative-position-bias");
    const t5Bias = getConceptById("concept.t5-relative-position-bias");

    expect(relativeBias?.relatedIds).toEqual([
      "concept.positional-encodings",
      "concept.absolute-positional-embeddings",
      "concept.t5-relative-position-bias",
      "concept.rope",
      "concept.alibi",
    ]);
    expect(relativeBias?.explainsIds).toEqual([
      "concept.t5-relative-position-bias",
    ]);
    expect(relativeBias?.aliases).toEqual([
      "relative position bias",
      "Relative position bias",
      "relative positional bias",
      "relative attention bias",
    ]);
    expect(relativeBiasModule?.aliases).toEqual([
      "relative position bias",
      "Relative position bias",
      "relative positional bias",
      "relative attention bias",
    ]);
    expect(t5Bias?.relatedIds).toEqual([
      "concept.positional-encodings",
      "concept.relative-position-bias",
      "concept.encoder-decoder",
      "concept.rope",
      "concept.alibi",
    ]);
    expect(t5Bias?.prerequisiteIds).toEqual([
      "concept.positional-encodings",
      "concept.relative-position-bias",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.t5-relative-position-bias"),
    ).toBe(true);
  });

  test("family related-doc links resolve between relative bias, T5 bias, RoPE, and ALiBi", () => {
    const relativeBias = getConceptById("concept.relative-position-bias");
    const t5Bias = getConceptById("concept.t5-relative-position-bias");

    if (!relativeBias || !t5Bias) {
      throw new Error("expected relative bias family records in registry");
    }

    const records = listRelatedRegistryRecords();
    const relativeItems = deriveCuratedRelatedItems(
      relativeBias,
      records,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    const t5Items = deriveCuratedRelatedItems(
      t5Bias,
      records,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relativeItems.find(
        (item) => item.registryId === "concept.t5-relative-position-bias",
      )?.href,
    ).toBe("/docs/modules/t5-relative-position-bias");
    expect(
      relativeItems.find((item) => item.registryId === "concept.rope")?.href,
    ).toBe("/docs/modules/rope");
    expect(
      relativeItems.find((item) => item.registryId === "concept.alibi")?.href,
    ).toBe("/docs/modules/alibi");
    expect(
      t5Items.find(
        (item) => item.registryId === "concept.relative-position-bias",
      )?.href,
    ).toBe("/docs/modules/relative-position-bias");
    expect(
      t5Items.find((item) => item.registryId === "concept.rope")?.href,
    ).toBe("/docs/modules/rope");
    expect(
      t5Items.find((item) => item.registryId === "concept.alibi")?.href,
    ).toBe("/docs/modules/alibi");
  });

  test("neighboring family pages surface relative position bias through their real related-doc groups", () => {
    const relativeBiasModule = getModuleById("module.relative-position-bias");
    const t5BiasModule = getModuleById("module.t5-relative-position-bias");
    const alibiModule = getModuleById("module.alibi");
    const rope = getConceptById("concept.rope");
    const absolute = getConceptById("concept.absolute-positional-embeddings");

    if (
      !relativeBiasModule ||
      !t5BiasModule ||
      !alibiModule ||
      !rope ||
      !absolute
    ) {
      throw new Error(
        "expected relative position bias family records in registry",
      );
    }

    const records = listRelatedRegistryRecords();
    const modules = records.filter((record) => record.kind === "module");

    const alibiVariantGroupItems = deriveSameVariantGroupPeers(
      alibiModule,
      modules,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(
      alibiVariantGroupItems.find(
        (item) => item.registryId === "module.relative-position-bias",
      )?.href,
    ).toBe("/docs/modules/relative-position-bias");
    expect(
      alibiVariantGroupItems.find(
        (item) => item.registryId === "module.t5-relative-position-bias",
      )?.href,
    ).toBe("/docs/modules/t5-relative-position-bias");

    const ropeCuratedItems = deriveCuratedRelatedItems(
      rope,
      records,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(
      ropeCuratedItems.find(
        (item) => item.registryId === "concept.relative-position-bias",
      )?.href,
    ).toBe("/docs/modules/relative-position-bias");

    const absoluteCuratedItems = deriveCuratedRelatedItems(
      absolute,
      records,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(
      absoluteCuratedItems.find(
        (item) => item.registryId === "concept.relative-position-bias",
      )?.href,
    ).toBe("/docs/modules/relative-position-bias");
  });

  test("published pages render with visible family navigation and references", async () => {
    for (const slug of [
      "relative-position-bias",
      "t5-relative-position-bias",
    ] as const) {
      const page = await loadModulePage(slug);
      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expect(page.frontmatter.status).toBe("published");
      expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
      expect(html).toContain("Related Concepts And Modules");
      expect(html).toContain("References");
      expect(html).toContain('href="/docs/concepts/positional-encodings"');
      expect(html).toContain('href="/docs/modules/rope"');
      expect(html).toContain('href="/docs/modules/alibi"');
      expect(html).toContain('href="/tags/foundations"');
    }

    const relativeBiasPage = await loadModulePage("relative-position-bias");
    const relativeBiasHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: relativeBiasPage.messages,
        assets: relativeBiasPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: relativeBiasPage.content,
      }),
    );
    expect(relativeBiasHtml).toContain(
      'href="/docs/modules/t5-relative-position-bias"',
    );

    const t5Page = await loadModulePage("t5-relative-position-bias");
    const t5Html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: t5Page.messages,
        assets: t5Page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: t5Page.content,
      }),
    );
    expect(t5Html).toContain('href="/docs/modules/relative-position-bias"');
    expect(t5Html).toContain("Raffel");

    const alibiPage = await loadModulePage("alibi");
    const alibiHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: alibiPage.messages,
        assets: alibiPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: alibiPage.content,
      }),
    );
    expect(alibiHtml).toContain('data-testid="variant-group-related-docs"');
    expect(alibiHtml).toContain('href="/docs/modules/relative-position-bias"');
    expect(alibiHtml).toContain(
      'href="/docs/modules/t5-relative-position-bias"',
    );

    const ropePage = await loadModulePage("rope");
    const ropeHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: ropePage.messages,
        assets: ropePage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: ropePage.content,
      }),
    );
    expect(ropeHtml).toContain('data-testid="curated-related-docs"');
    expect(ropeHtml).toContain('href="/docs/modules/relative-position-bias"');

    const absolutePage = await loadModulePage("absolute-positional-embeddings");
    const absoluteHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: absolutePage.messages,
        assets: absolutePage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: absolutePage.content,
      }),
    );
    expect(absoluteHtml).toContain('data-testid="curated-related-docs"');
    expect(absoluteHtml).toContain(
      'href="/docs/modules/relative-position-bias"',
    );
  });

  test("relative position bias page copy explains the family in plain language and contrasts nearby methods", async () => {
    const page = await loadModulePage("relative-position-bias");
    const messages = pageMessagesSchema.parse(page.messages);

    expect(messages.openingSummary).toContain("broad family");
    expect(messages.openingSummary).toContain("absolute positional embeddings");
    expect(messages.openingSummary).toContain("T5");
    expect(messages.openingSummary).toContain("ALiBi");
    expect(messages.openingSummary).toContain("RoPE");

    expect(messages.sections?.whatItIs.body).toContain("family idea first");
    expect(messages.sections?.whyItMatters.body).toContain(
      "absolute positional embeddings",
    );
    expect(messages.sections?.simpleExample.body).toContain(
      "relative gaps such as near, medium, and far",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "T5 relative position bias is a bucketed subtype",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "ALiBi is a simpler linear-bias member",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "RoPE sits nearby but works differently",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "Absolute positional embeddings also solve token order in a different way",
    );
  });
});

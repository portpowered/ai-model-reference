import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { validatePageAssetReferences } from "@/lib/content/assets";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntriesBySlug,
  getPublishedDocsEntryByRegistryId,
} from "@/lib/content/published-docs-registry-ids";
import { getConceptById } from "@/lib/content/registry-runtime";
import { docsSearchApi } from "@/lib/search/search-server";

describe("decoder concept page focused validation (decoder-concept-page-004)", () => {
  test("published docs inventory resolves the canonical decoder route, registry id, and English messages together", async () => {
    const record = getConceptById("concept.decoder");
    const pages = await loadPublishedDocsPages("en");
    const conceptPage = pages.find(
      (entry) => entry.url === "/docs/concepts/decoder",
    );
    const glossaryPage = pages.find(
      (entry) => entry.url === "/docs/glossary/decoder",
    );

    expect(record?.status).toBe("published");
    expect(conceptPage).toBeDefined();
    expect(conceptPage?.docsSlug).toBe("concepts/decoder");
    expect(conceptPage?.frontmatter.kind).toBe("concept");
    expect(conceptPage?.frontmatter.registryId).toBe("concept.decoder");
    expect(conceptPage?.frontmatter.messageNamespace).toBe("local");
    expect(conceptPage?.frontmatter.assetNamespace).toBe("local");
    expect(conceptPage?.messages.title).toBe("Decoder");
    expect(conceptPage?.messages.openingSummary).toContain(
      "predicts the next token",
    );

    expect(glossaryPage?.frontmatter.kind).toBe("glossary");
    expect(glossaryPage?.frontmatter.registryId).toBe("concept.decoder");

    expect(getPublishedDocsEntryByRegistryId("concept.decoder")).toEqual(
      expect.objectContaining({
        docsSlug: "concepts/decoder",
        pageKind: "concept",
        section: "concepts",
      }),
    );
    expect(getPublishedDocsEntriesBySlug("decoder")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          docsSlug: "concepts/decoder",
          pageKind: "concept",
        }),
        expect.objectContaining({
          docsSlug: "glossary/decoder",
          pageKind: "glossary",
        }),
      ]),
    );
  });

  test("canonical decoder bundle resolves registry-backed copy and valid local assets together", async () => {
    const record = getConceptById("concept.decoder");
    if (!record) {
      throw new Error("expected concept.decoder in registry");
    }

    const page = await loadConceptPage("decoder");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("Decoder");
    expect(page.messages.description).toContain(
      "turns context into output predictions",
    );
    expect(page.messages.sections?.whatItIs.body).toContain(
      "readout side of the system",
    );
    expect(page.messages.sections?.decoderOnlyLoop.body).toContain(
      "left-to-right, or causal, attention",
    );
    expect(page.messages.sections?.comparedWithOtherLayouts.body).toContain(
      "encoder-decoder model splits the work",
    );
    expect(validatePageAssetReferences(page.assets, page.messages)).toEqual([]);
  });

  test("discovery prefers the canonical concept route while the glossary bridge remains a visible nearby surface", async () => {
    const conceptResults = await docsSearchApi.search("decoder-only stack");
    expect(conceptResults[0]?.url).toBe("/docs/concepts/decoder");

    const bridgeResults = await docsSearchApi.search("decoding network");
    expect(
      bridgeResults.some((result) => result.url === "/docs/concepts/decoder"),
    ).toBe(true);
    expect(
      bridgeResults.some((result) => result.url === "/docs/glossary/decoder"),
    ).toBe(true);

    const glossaryPage = await loadGlossaryPage("decoder");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: glossaryPage.messages,
        assets: glossaryPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: glossaryPage.content,
      }),
    );

    expect(html).toContain('href="/docs/concepts/decoder"');
  });
});

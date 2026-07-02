import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { getConceptById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.synthetic-data";
const SLUG = "synthetic-data";
const CONCEPT_URL = "/docs/concepts/synthetic-data";
const pageDir = getDocsPageDir("concepts", SLUG);
const messagesPath = join(pageDir, "messages/en.json");

describe("synthetic-data concept discovery", () => {
  test("registry record stays published with synthetic-data aliases and training tags", () => {
    const record = getConceptById(REGISTRY_ID);
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Synthetic data",
      "synthetic data",
      "model-generated data",
      "generated training data",
    ]);
    expect(record?.tags).toEqual(["foundations", "alignment"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
  });

  test("canonical route resolves to the published registry record and English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const page = await loadConceptPage(SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: CONCEPT_URL,
      section: "concepts",
      docsSlug: "concepts/synthetic-data",
    });
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
  });

  test("published English docs loader resolves the canonical route from pageDir", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.pageDir === pageDir);

    expect(page?.url).toBe(CONCEPT_URL);
    expect(page?.docsSlug).toBe("concepts/synthetic-data");
    expect(page?.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page?.messages.title).toBe("Synthetic Data");
  });

  test("search index records synthetic data with aliases and training tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Synthetic data",
        "model-generated data",
        "generated training data",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "alignment"]),
    );
  });

  test("search finds synthetic data by title, aliases, and body terms", async () => {
    for (const query of [
      "Synthetic data",
      "model-generated data",
      "generated training data",
      "teacher model",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });
});

describe("synthetic-data concept page", () => {
  test("messages define synthetic data as model-generated training material, not all training data", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Synthetic Data");
    expect(messages.openingSummary?.toLowerCase()).toContain(
      "model-generated training material",
    );
    expect(messages.openingSummary?.toLowerCase()).toContain(
      "not a catch-all label",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "produced or transformed by a model",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "training signal was generated",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "scale coverage",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "not a synonym for all training data",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "web pretraining corpora",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "human-authored instruction data",
    );
  });

  test("page renders title, sections, opening summary, tags, and related docs", async () => {
    const page = await loadConceptPage(SLUG);

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
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
    expect(html).toContain("produced or transformed by a model");
    expect(html).toContain("not a synonym for all training data");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="curated-related"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("on this page");
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsWhereItAppears,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { type ConceptRecord, pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const EVALUATION_SCALING_SLUGS = [
  "perplexity",
  "scaling-law",
  "emergent-behavior",
] as const;

function renderGlossaryHtml(slug: (typeof EVALUATION_SCALING_SLUGS)[number]) {
  return loadGlossaryPage(slug).then((page) =>
    renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    ),
  );
}

describe("Phase 2 evaluation and scaling glossary pages (US-005)", () => {
  for (const slug of EVALUATION_SCALING_SLUGS) {
    test(`${slug} messages include required concept template keys`, () => {
      const messagesPath = join(GLOSSARY_DOCS_ROOT, slug, "messages/en.json");
      const messages = pageMessagesSchema.parse(
        JSON.parse(readFileSync(messagesPath, "utf8")),
      );

      expect(messages.title.length).toBeGreaterThan(0);
      expect(messages.openingSummary?.length).toBeGreaterThan(0);
      expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.simpleExample.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.commonConfusions.body?.length).toBeGreaterThan(
        0,
      );
      expect(messages.description).not.toContain("Draft placeholder");
    });

    test(`${slug} glossary page compiles with localized sections and tags`, async () => {
      const page = await loadGlossaryPage(slug);

      expect(page.frontmatter.kind).toBe("glossary");
      expect(page.frontmatter.status).toBe("published");
      expect(page.frontmatter.registryId).toBe(`concept.${slug}`);

      const html = await renderGlossaryHtml(slug);

      expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
      expectHtmlToContainProse(
        html,
        page.messages.openingSummary?.slice(0, 24) ?? "",
      );
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('href="/tags/taxonomy"');
      expectGlossaryOmitsWhereItAppears(html);
      expect(html).not.toContain("Draft placeholder");
    });
  }

  test("perplexity links to token chain and generalization with published softmax and entropy pages", async () => {
    const html = await renderGlossaryHtml("perplexity");

    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/glossary/generalization"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain('href="/docs/glossary/entropy"');
    expect(html).toContain("Curated related");
  });

  test("scaling law connects to capacity, generalization, and emergent behavior", async () => {
    const html = await renderGlossaryHtml("scaling-law");

    expect(html).toContain('href="/docs/glossary/model-capacity"');
    expect(html).toContain('href="/docs/glossary/generalization"');
    expect(html).toContain('href="/docs/glossary/perplexity"');
    expect(html).toContain('href="/docs/glossary/emergent-behavior"');
    expect(html).toContain("Kaplan");
    expect(html).toContain("https://arxiv.org/abs/2001.08361");
  });

  test("emergent behavior links to scaling law and generalization with citation", async () => {
    const html = await renderGlossaryHtml("emergent-behavior");

    expect(html).toContain('href="/docs/glossary/scaling-law"');
    expect(html).toContain('href="/docs/glossary/generalization"');
    expect(html).toContain('href="/docs/glossary/model-capacity"');
    expect(html).toContain("Wei");
    expect(html).toContain("https://arxiv.org/abs/2206.07682");
  });

  test("registry uses evaluation concept type for evaluation cluster", async () => {
    const registry = await loadRegistry();
    const perplexity = registry.byId.get("concept.perplexity") as ConceptRecord;
    const scalingLaw = registry.byId.get(
      "concept.scaling-law",
    ) as ConceptRecord;
    const emergentBehavior = registry.byId.get(
      "concept.emergent-behavior",
    ) as ConceptRecord;

    expect(perplexity.conceptType).toBe("evaluation");
    expect(scalingLaw.conceptType).toBe("evaluation");
    expect(emergentBehavior.conceptType).toBe("evaluation");
    expect(perplexity.prerequisiteIds).toEqual(
      expect.arrayContaining([
        "concept.token",
        "concept.softmax",
        "concept.entropy",
      ]),
    );
    expect(scalingLaw.prerequisiteIds).toEqual(
      expect.arrayContaining([
        "concept.model-capacity",
        "concept.parameter",
        "concept.generalization",
      ]),
    );
    expect(emergentBehavior.prerequisiteIds).toEqual(
      expect.arrayContaining(["concept.scaling-law", "concept.generalization"]),
    );
  });

  test("search index records evaluation pages with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const slug of EVALUATION_SCALING_SLUGS) {
      const document = documents.find(
        (entry) => entry.url === `/docs/glossary/${slug}`,
      );
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
    }
  });

  test("search finds perplexity by title and alias and scaling law by tag", async () => {
    const pplResults = await docsSearchApi.search("language model perplexity");
    expect(pplResults.some((r) => r.url === "/docs/glossary/perplexity")).toBe(
      true,
    );

    const aliasResults = await docsSearchApi.search("PPL");
    expect(
      aliasResults.some((r) => r.url === "/docs/glossary/perplexity"),
    ).toBe(true);

    const scalingResults = await docsSearchApi.search("compute scaling");
    expect(
      scalingResults.some((r) => r.url === "/docs/glossary/scaling-law"),
    ).toBe(true);

    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const perplexityDoc = documents.find(
      (entry) => entry.url === "/docs/glossary/perplexity",
    );
    const scalingDoc = documents.find(
      (entry) => entry.url === "/docs/glossary/scaling-law",
    );

    expect(perplexityDoc?.title).toBe("Perplexity");
    expect(perplexityDoc?.aliases).toEqual(
      expect.arrayContaining(["PPL", "cross-entropy perplexity"]),
    );
    expect(scalingDoc?.tags).toEqual(
      expect.arrayContaining(["foundations", "taxonomy"]),
    );
  });
});

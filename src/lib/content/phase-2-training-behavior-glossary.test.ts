import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { type ConceptRecord, pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const TRAINING_BEHAVIOR_SLUGS = [
  "alignment",
  "model-capacity",
  "overfitting",
  "generalization",
] as const;

function renderGlossaryHtml(slug: (typeof TRAINING_BEHAVIOR_SLUGS)[number]) {
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

describe("Phase 2 training behavior glossary pages (US-004)", () => {
  for (const slug of TRAINING_BEHAVIOR_SLUGS) {
    test(`${slug} messages include required concept template keys`, () => {
      const messagesPath = join(GLOSSARY_DOCS_ROOT, slug, "messages/en.json");
      const messages = pageMessagesSchema.parse(
        JSON.parse(readFileSync(messagesPath, "utf8")),
      );

      expect(messages.title.length).toBeGreaterThan(0);
      expect(messages.problemStatement?.length).toBeGreaterThan(0);
      expect(messages.coreIdea?.length).toBeGreaterThan(0);
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

      expect(html).toContain(page.messages.title);
      expect(html).toContain(page.messages.coreIdea?.slice(0, 24) ?? "");
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('href="/tags/taxonomy"');
      expect(html).toContain('data-testid="derived-related-docs"');
      expect(html).not.toContain("Draft placeholder");
    });
  }

  test("alignment links to training peers and published token-chain glossary pages", async () => {
    const html = await renderGlossaryHtml("alignment");

    expect(html).toContain('href="/docs/glossary/model-capacity"');
    expect(html).toContain('href="/docs/glossary/overfitting"');
    expect(html).toContain('href="/docs/glossary/generalization"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/glossary/parameter"');
    expect(html).toContain('href="/docs/glossary/loss-function"');
    expect(html).toContain('href="/docs/glossary/optimizer-state"');
  });

  test("overfitting and generalization cross-link with reason labels", async () => {
    const overfittingHtml = await renderGlossaryHtml("overfitting");
    const generalizationHtml = await renderGlossaryHtml("generalization");

    expect(overfittingHtml).toContain('href="/docs/glossary/generalization"');
    expect(generalizationHtml).toContain('href="/docs/glossary/overfitting"');
    expect(generalizationHtml).toContain(
      'href="/docs/glossary/model-capacity"',
    );
    expect(generalizationHtml).toContain("Curated related");
    expect(generalizationHtml).toContain("Shared tag");
  });

  test("registry uses training and evaluation concept types", async () => {
    const registry = await loadRegistry();
    const alignment = registry.byId.get("concept.alignment") as ConceptRecord;
    const modelCapacity = registry.byId.get(
      "concept.model-capacity",
    ) as ConceptRecord;
    const overfitting = registry.byId.get(
      "concept.overfitting",
    ) as ConceptRecord;
    const generalization = registry.byId.get(
      "concept.generalization",
    ) as ConceptRecord;

    expect(alignment.conceptType).toBe("training");
    expect(modelCapacity.conceptType).toBe("training");
    expect(overfitting.conceptType).toBe("training");
    expect(generalization.conceptType).toBe("evaluation");
  });

  test("search index records training behavior pages with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const slug of TRAINING_BEHAVIOR_SLUGS) {
      const document = documents.find(
        (entry) => entry.url === `/docs/glossary/${slug}`,
      );
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
    }
  });

  test("search finds overfitting and generalization by title and body text", async () => {
    const overfitResults = await docsSearchApi.search(
      "training set memorization",
    );
    expect(
      overfitResults.some((r) => r.url === "/docs/glossary/overfitting"),
    ).toBe(true);

    const generalizationResults = await docsSearchApi.search(
      "held-out performance",
    );
    expect(
      generalizationResults.some(
        (r) => r.url === "/docs/glossary/generalization",
      ),
    ).toBe(true);

    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const overfittingDoc = documents.find(
      (entry) => entry.url === "/docs/glossary/overfitting",
    );
    const generalizationDoc = documents.find(
      (entry) => entry.url === "/docs/glossary/generalization",
    );

    expect(overfittingDoc?.description).toContain("memorization");
    expect(generalizationDoc?.title).toBe("Generalization");
    expect(generalizationDoc?.tags).toEqual(
      expect.arrayContaining(["foundations", "taxonomy"]),
    );
  });
});

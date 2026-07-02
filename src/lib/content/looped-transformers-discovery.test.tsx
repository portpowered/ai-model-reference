import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBrowseIndexPage } from "@/app/(site)/site-renderers";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { listClassificationMembers } from "@/lib/content/registry-runtime";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const LOOPED_TRANSFORMERS_URL = "/docs/modules/looped-transformers";

describe("looped transformers discovery surfaces (looped-transformers-005)", () => {
  test("search documents carry canonical discovery phrases and looped-transformer journey metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === LOOPED_TRANSFORMERS_URL,
    );

    expect(document).toBeDefined();
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "looped transformers",
        "looped transformer",
        "learning learning algorithms",
        "iterative transformer",
        "iterative in-context learning",
        "weight-shared looped transformer",
        "looped transformer block",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "model-family"]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.transformer-architecture",
        "concept.self-attention",
        "module.attention",
        "module.feed-forward-network",
        "paper.looped-transformers-learning-learning-algorithms",
        "citation.looped-transformers-iclr-2024",
      ]),
    );
  });

  test.each([
    "looped transformers",
    "looped transformer",
    "learning learning algorithms",
    "iterative in-context learning",
    "iterative transformer",
  ] as const)("live search routes %s to the canonical looped transformers page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(LOOPED_TRANSFORMERS_URL);
  });

  test("foundations and model-family tag browsing include the published module under Module groups", async () => {
    const messages = await loadUiMessages();

    for (const tagSlug of ["foundations", "model-family"] as const) {
      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      const moduleGroup = groups.find((group) => group.kind === "module");

      expect(moduleGroup).toBeDefined();
      expect(
        moduleGroup?.resources.some(
          (resource) => resource.url === LOOPED_TRANSFORMERS_URL,
        ),
      ).toBe(true);
    }
  });

  test("transformer-block classification browsing lists the looped transformers module", async () => {
    const members = listClassificationMembers(
      "classification.module.transformer-block",
    ).map((member) => member.record.id);

    expect(members).toEqual(
      expect.arrayContaining([
        "module.looped-transformers",
        "module.diffusion-transformer-block",
      ]),
    );

    const browsePage = await renderBrowseIndexPage(undefined, {
      searchParams: Promise.resolve({
        classification: "transformer-block-structures",
        mode: "graph-map",
      }),
    });
    const browseHtml = renderToStaticMarkup(browsePage);

    expect(browseHtml).toContain(LOOPED_TRANSFORMERS_URL);
    expect(browseHtml).not.toContain("Nothing has shipped");
    expect(browseHtml).not.toContain("No resources");
  });

  test(
    "rendered page shell exposes tag links, curated related docs, and no unpublished paper routes",
    async () => {
      const page = await loadModulePage("looped-transformers");
      const html = renderModuleDocsShell(page);

      expect(html).toContain("Looped Transformers");
      expect(html).toContain("At a glance");
      expect(html).toContain('data-testid="tag-pill-list"');
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('href="/tags/model-family"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain('href="/docs/concepts/transformer-architecture"');
      expect(html).toContain('href="/docs/modules/attention"');
      expect(html).toContain('href="/docs/modules/feed-forward-network"');
      expect(html).toContain('href="https://arxiv.org/abs/2311.12424"');
      expect(html).not.toContain(
        "/docs/papers/looped-transformers-learning-learning-algorithms",
      );
      expect(html).not.toContain("TODO");
      expect(html).not.toContain("__MISSING");
    },
    { timeout: 15_000 },
  );
});

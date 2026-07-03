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

const DIFFUSION_TRANSFORMER_BLOCK_URL =
  "/docs/modules/diffusion-transformer-block";

describe("diffusion transformer block discovery surfaces (diffusion-transformer-block-module-004)", () => {
  test("search documents carry canonical discovery phrases and diffusion journey metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === DIFFUSION_TRANSFORMER_BLOCK_URL,
    );

    expect(document).toBeDefined();
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "diffusion transformer block",
        "DiT block",
        "diffusion transformer",
        "timestep conditioned transformer block",
        "patch denoising transformer",
        "timestep conditioning transformer",
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
        "concept.denoising-generation",
        "training-regime.diffusion-training-objective",
        "concept.latent-space",
        "concept.conditioning",
        "concept.patch",
        "paper.latent-diffusion",
      ]),
    );
  });

  test.each([
    "diffusion transformer block",
    "DiT block",
    "timestep conditioning transformer",
    "patch denoising transformer",
    "diffusion transformer",
  ] as const)("live search routes %s to the canonical diffusion transformer block page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
      DIFFUSION_TRANSFORMER_BLOCK_URL,
    );
  });

  test("foundations and model-family tag browsing include the published module under Module groups", async () => {
    const messages = await loadUiMessages();

    for (const tagSlug of ["foundations", "model-family"] as const) {
      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      const moduleGroup = groups.find((group) => group.kind === "module");

      expect(moduleGroup).toBeDefined();
      expect(
        moduleGroup?.resources.some(
          (resource) => resource.url === DIFFUSION_TRANSFORMER_BLOCK_URL,
        ),
      ).toBe(true);
    }
  });

  test("transformer-block classification browsing lists the diffusion transformer block module", async () => {
    const members = listClassificationMembers(
      "classification.module.transformer-block",
    ).map((member) => member.record.id);

    expect(members).toEqual(
      expect.arrayContaining([
        "module.diffusion-transformer-block",
        "module.manifold-constrained-hyper-connections",
      ]),
    );

    const browsePage = await renderBrowseIndexPage(undefined, {
      searchParams: Promise.resolve({
        classification: "transformer-block-structures",
        mode: "graph-map",
      }),
    });
    const browseHtml = renderToStaticMarkup(browsePage);

    expect(browseHtml).toContain(DIFFUSION_TRANSFORMER_BLOCK_URL);
    expect(browseHtml).not.toContain("Nothing has shipped");
    expect(browseHtml).not.toContain("No resources");
  });

  test(
    "rendered page shell exposes tag links, curated related docs, and no unpublished paper routes",
    async () => {
      const page = await loadModulePage("diffusion-transformer-block");
      const html = renderModuleDocsShell(page);

      expect(html).toContain("Diffusion Transformer Block");
      expect(html).toContain("At a glance");
      expect(html).toContain('data-testid="tag-pill-list"');
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('href="/tags/model-family"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain('href="/docs/concepts/transformer-architecture"');
      expect(html).toContain('href="/docs/concepts/self-attention"');
      expect(html).toContain('href="/docs/modules/attention"');
      expect(html).toContain('href="/docs/concepts/feed-forward-network"');
      expect(html).toContain('href="/docs/glossary/denoising-generation"');
      expect(html).toContain(
        'href="/docs/training/diffusion-training-objective"',
      );
      expect(html).toContain('href="/docs/concepts/latent-space"');
      expect(html).toContain('href="/docs/glossary/conditioning"');
      expect(html).toContain('href="/docs/glossary/patch"');
      expect(html).toContain('href="/docs/papers/latent-diffusion"');
      expect(html).not.toContain("/docs/papers/diffusion-transformers");
      expect(html).not.toContain("TODO");
      expect(html).not.toContain("__MISSING");
    },
    { timeout: 15_000 },
  );
});

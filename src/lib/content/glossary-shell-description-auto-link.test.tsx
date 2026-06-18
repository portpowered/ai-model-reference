import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";
import { listPublishedGlossaryPages } from "@/lib/content/glossary";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import {
  expectGlossaryBodyOmitsShellDescription,
  expectGlossaryPresentationConvergence,
  expectGlossaryShellAutoLinksUseProseContract,
  expectGlossaryShellDescriptionAutoLink,
  expectHtmlToContainProse,
  extractGlossaryArticleHtml,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

describe("glossary shell description auto-link convergence", () => {
  test("glossary docs routes wire shell descriptions through DocsAutoLinkedDescription", () => {
    const pageRendererSource = readFileSync(
      join(process.cwd(), "src/app/docs/docs-slug-renderer.tsx"),
      "utf8",
    );
    const pageRouteSource = readFileSync(
      join(process.cwd(), "src/app/docs/[[...slug]]/page.tsx"),
      "utf8",
    );
    const shellRenderSource = readFileSync(
      join(process.cwd(), "src/lib/content/glossary-shell-render.tsx"),
      "utf8",
    );
    const autoLinkedDescriptionSource = readFileSync(
      join(
        process.cwd(),
        "src/features/docs/components/DocsAutoLinkedDescription.tsx",
      ),
      "utf8",
    );

    expect(pageRendererSource).toContain("DocsAutoLinkedDescription");
    expect(pageRendererSource).toContain('localRef.section === "glossary"');
    expect(pageRouteSource).toContain("renderDocsSlugPage");
    expect(shellRenderSource).toContain("DocsAutoLinkedDescription");
    expect(autoLinkedDescriptionSource).toContain("ProseAutoLinkText");
  });

  for (const [chunkIndex, slugChunk] of chunkValues(
    [
      "activation",
      "alibi",
      "alignment",
      "architecture",
      "autoregressive-generation",
      "component",
      "computational-graph",
      "conditioning",
      "context-window",
      "decode",
      "decoder",
      "denoising-generation",
      "diffusion-model",
      "discriminative-model",
      "embedding",
      "emergent-behavior",
      "encoder",
      "encoder-decoder",
      "entropy",
      "feed-forward-network",
      "foundation-model",
      "generalization",
      "generative-model",
      "gradient",
      "hidden-size",
      "kv-cache",
      "latent",
      "latent-space",
      "layer-norm",
      "logit",
      "loss-function",
      "mixture-of-experts",
      "modality",
      "model",
      "model-capacity",
      "module",
      "multimodal-model",
      "normalization",
      "optimizer-state",
      "overfitting",
      "parameter",
      "patch",
      "perplexity",
      "prefill",
      "prefill-decode-split",
      "representation",
      "residual-connection",
      "rmsnorm",
      "rope",
      "scaling-law",
      "softmax",
      "temperature",
      "tensor",
      "token",
      "transformer",
      "vector",
      "world-model",
    ],
    20,
  ).entries()) {
    test(
      `published glossary pages chunk ${chunkIndex + 1} renders auto-linked shell descriptions without body duplication`,
      async () => {
        const pageSet = new Set(slugChunk);
        const pages = (await listPublishedGlossaryPages()).filter((page) =>
          pageSet.has(page.slug),
        );

        expect(pages).toHaveLength(slugChunk.length);

        for (const page of pages) {
          const loadedPage = await loadLocalDocsPage({
            section: "glossary",
            slug: page.slug,
          });
          const html = renderGlossaryDocsShell(loadedPage);
          const articleHtml = extractGlossaryArticleHtml(
            html,
            loadedPage.frontmatter.registryId,
          );

          const articleStart = html.indexOf("<article");
          const shellHtml =
            articleStart >= 0 ? html.slice(0, articleStart) : html;
          expectHtmlToContainProse(shellHtml, loadedPage.messages.description);
          expectGlossaryBodyOmitsShellDescription(
            articleHtml,
            loadedPage.messages.description,
          );
          expectGlossaryShellAutoLinksUseProseContract(html);
        }
      },
      { timeout: 10_000 },
    );
  }

  test("/docs/glossary/embedding shell description links dense vector and token with preserved link text", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "embedding",
    });
    const html = renderGlossaryDocsShell(loadedPage);
    const articleHtml = html.slice(html.indexOf("<article"));

    expectHtmlToContainProse(
      html,
      "A dense vector that represents a token or other discrete item so the model can run continuous math on it.",
    );
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/vector",
      phrase: "dense vector",
    });
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/token",
      phrase: "token",
    });
    expectGlossaryBodyOmitsShellDescription(
      articleHtml,
      loadedPage.messages.description,
    );
  });

  test("/docs/glossary/vector shell description links embeddings to the embedding glossary page", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "vector",
    });
    const html = renderGlossaryDocsShell(loadedPage);
    const articleHtml = extractGlossaryArticleHtml(
      html,
      loadedPage.frontmatter.registryId,
    );

    expectHtmlToContainProse(
      html,
      "An ordered list of numbers that represents a point or direction in continuous space—embeddings and activations are vectors at different stages of the model.",
    );
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/embedding",
      phrase: "embeddings",
    });
    expectGlossaryPresentationConvergence(articleHtml, {
      title: loadedPage.messages.title,
    });
  });

  test("/docs/glossary/hidden-size shell description links token embedding and token with preserved link text", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "hidden-size",
    });
    const html = renderGlossaryDocsShell(loadedPage);
    const articleHtml = extractGlossaryArticleHtml(
      html,
      loadedPage.frontmatter.registryId,
    );

    expectHtmlToContainProse(
      html,
      "The width of a model's internal vectors—the number of dimensions in each token embedding and each token's per-position hidden state before the vocabulary projection.",
    );
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/vector",
      phrase: "vectors",
    });
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/embedding",
      phrase: "token embedding",
    });
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/token",
      phrase: "token",
    });
    expectGlossaryPresentationConvergence(articleHtml, {
      title: loadedPage.messages.title,
    });
  });

  test("/docs/glossary/token shell description links bridge concepts without duplicating shell chrome", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });
    const html = renderGlossaryDocsShell(loadedPage);
    const articleHtml = extractGlossaryArticleHtml(
      html,
      loadedPage.frontmatter.registryId,
    );

    expectHtmlToContainProse(
      html,
      "Each token ID maps to a dense vector through vector embedding of model hidden size before attention runs.",
    );
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/token",
      phrase: "token ID",
    });
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/vector",
      phrase: "dense vector",
    });
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/embedding",
      phrase: "vector embedding",
    });
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/hidden-size",
      phrase: "hidden size",
    });
    expectGlossaryPresentationConvergence(articleHtml, {
      title: loadedPage.messages.title,
    });
    expectGlossaryBodyOmitsShellDescription(
      articleHtml,
      loadedPage.messages.description,
    );
  });

  test("ambiguous phrases in shell descriptions stay plain text", () => {
    const html = renderToStaticMarkup(
      createElement(ProseAutoLinkText, {
        text: "Unknown phraseology without registry matches.",
      }),
    );

    expect(html).not.toContain("data-prose-auto-link");
    expect(html).toContain("Unknown phraseology without registry matches.");
  });
});

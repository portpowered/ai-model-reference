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
  expectGlossaryOmitsOpeningSummary,
  expectGlossaryOmitsWhereItAppears,
} from "@/lib/content/glossary-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const REPRESENTATION_LATENT_SLUGS = [
  "patch",
  "latent",
  "latent-space",
] as const;

function renderGlossaryHtml(
  slug: (typeof REPRESENTATION_LATENT_SLUGS)[number],
) {
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

describe("Phase 2 representation and latent glossary pages (US-001)", () => {
  for (const slug of REPRESENTATION_LATENT_SLUGS) {
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
      expectGlossaryOmitsOpeningSummary(html);
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('href="/tags/taxonomy"');
      if (slug === "latent-space") {
        expect(html).toContain('href="/tags/model-family"');
      }
      expectGlossaryOmitsWhereItAppears(html);
      expect(html).not.toContain("Draft placeholder");
    });
  }

  test("patch page links to representation and latent peers", async () => {
    const html = await renderGlossaryHtml("patch");

    expect(html).toContain('href="/docs/glossary/latent"');
    expect(html).toContain('href="/docs/glossary/modality"');
  });

  test("latent-space links to diffusion, denoising, conditioning, and latent diffusion paper", async () => {
    const html = await renderGlossaryHtml("latent-space");

    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/papers/latent-diffusion"');
    expect(html).toContain("Denoising");
  });

  test("latent-space links to embedding and latent peers", async () => {
    const html = await renderGlossaryHtml("latent-space");

    expect(html).toContain('href="/docs/concepts/embedding"');
    expect(html).toContain('href="/docs/glossary/latent"');
  });

  test("search finds patch, latent, and latent space by title and alias", async () => {
    const patchResults = await docsSearchApi.search("Patch");
    expect(patchResults.some((r) => r.url === "/docs/glossary/patch")).toBe(
      true,
    );

    const latentCodeResults = await docsSearchApi.search("latent code");
    expect(
      latentCodeResults.some((r) => r.url === "/docs/glossary/latent"),
    ).toBe(true);

    const manifoldResults = await docsSearchApi.search("latent manifold");
    expect(
      manifoldResults.some((r) => r.url === "/docs/glossary/latent-space"),
    ).toBe(true);
  });
});

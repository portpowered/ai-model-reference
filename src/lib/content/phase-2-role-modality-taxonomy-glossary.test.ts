import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { pageMessagesSchema } from "@/lib/content/schemas";

const ROLE_MODALITY_TAXONOMY_SLUGS = [
  "modality",
  "foundation-model",
  "generative-model",
  "discriminative-model",
  "representation",
] as const;

function renderGlossaryHtml(
  slug: (typeof ROLE_MODALITY_TAXONOMY_SLUGS)[number],
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

describe("Phase 2 role and modality taxonomy glossary pages (US-005)", () => {
  for (const slug of ROLE_MODALITY_TAXONOMY_SLUGS) {
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
    });

    test(`${slug} glossary page compiles with localized sections and tags`, async () => {
      const page = await loadGlossaryPage(slug);
      const registrySlug = slug;

      expect(page.frontmatter.kind).toBe("glossary");
      expect(page.frontmatter.status).toBe("published");
      expect(page.frontmatter.messageNamespace).toBe("local");
      expect(page.frontmatter.registryId).toBe(`concept.${registrySlug}`);

      const html = await renderGlossaryHtml(slug);

      expect(html).toContain(page.messages.title);
      expect(html).toContain(page.messages.coreIdea?.slice(0, 24) ?? "");
      expect(html).toContain('href="/tags/taxonomy"');
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="derived-related-docs"');
      expect(html).toContain("What It Is");
      expect(html).toContain("Related Concepts And Modules");
      expect(html).toContain("Common Confusions");
    });
  }

  test("generative and discriminative pages distinguish roles in common confusions", async () => {
    const generative = await loadGlossaryPage("generative-model");
    const discriminative = await loadGlossaryPage("discriminative-model");

    expect(generative.messages.sections?.commonConfusions.body).toContain(
      "discriminative",
    );
    expect(discriminative.messages.sections?.commonConfusions.body).toContain(
      "generative",
    );
  });

  test("representation page distinguishes representation from embedding", async () => {
    const representation = await loadGlossaryPage("representation");

    expect(representation.messages.sections?.commonConfusions.body).toContain(
      "embedding",
    );
    expect(representation.messages.sections?.commonConfusions.body).toContain(
      "representation",
    );
  });

  test("foundation-model links to generative and discriminative via curated related docs", async () => {
    const html = await renderGlossaryHtml("foundation-model");

    expect(html).toContain('href="/docs/glossary/generative-model"');
    expect(html).toContain('href="/docs/glossary/discriminative-model"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });

  test("generative-model links to discriminative and representation peers", async () => {
    const html = await renderGlossaryHtml("generative-model");

    expect(html).toContain('href="/docs/glossary/discriminative-model"');
    expect(html).toContain('href="/docs/glossary/representation"');
  });

  test("modality links to representation and model page links to modality", async () => {
    const modalityHtml = await renderGlossaryHtml("modality");
    const modelPage = await loadGlossaryPage("model");
    const modelHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: modelPage.messages,
        assets: modelPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: modelPage.content,
      }),
    );

    expect(modalityHtml).toContain('href="/docs/glossary/representation"');
    expect(modelHtml).toContain('href="/docs/glossary/modality"');
    expect(modelHtml).toContain('href="/docs/glossary/foundation-model"');
  });
});

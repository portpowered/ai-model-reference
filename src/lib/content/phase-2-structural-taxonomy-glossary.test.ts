import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { PLANNED_RELATED_REASON_LABEL } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";

const STRUCTURAL_TAXONOMY_SLUGS = [
  "model",
  "architecture",
  "module",
  "component",
] as const;

describe("Phase 2 structural taxonomy glossary pages (US-004)", () => {
  for (const slug of STRUCTURAL_TAXONOMY_SLUGS) {
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
    });

    test(`${slug} glossary page compiles with localized sections and tags`, async () => {
      const page = await loadGlossaryPage(slug);

      expect(page.frontmatter.kind).toBe("glossary");
      expect(page.frontmatter.status).toBe("published");
      expect(page.frontmatter.messageNamespace).toBe("local");
      expect(page.frontmatter.registryId).toBe(`concept.${slug}`);

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
      expect(html).toContain(page.messages.openingSummary?.slice(0, 24) ?? "");
      expect(html).toContain('href="/tags/taxonomy"');
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="derived-related-docs"');
      expect(html).toContain("What It Is");
      expect(html).toContain("Related Concepts And Modules");
    });
  }

  test("model page links to architecture via curated related docs", async () => {
    const page = await loadGlossaryPage("model");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/architecture"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });

  test("architecture page shows planned forward targets without broken hrefs", async () => {
    const page = await loadGlossaryPage("architecture");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain(PLANNED_RELATED_REASON_LABEL);
    expect(html).toContain('data-planned="true"');
    expect(html).toContain('href="/docs/glossary/model"');
    expect(html).toContain('href="/docs/glossary/module"');
    expect(html).not.toContain('href="/docs/glossary/transformer"');
    expect(html).not.toContain('href="/docs/glossary/diffusion-model"');
  });
});

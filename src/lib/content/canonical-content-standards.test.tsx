import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeArticle } from "@/components/home/home-article";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadModulePage } from "@/lib/content/module-page";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { modelAtlasSiteConfig } from "@/lib/site/model-atlas-site-config";
import {
  RENDERED_QUALITY_PROCESS_LANGUAGE_PATTERNS,
  RENDERED_QUALITY_READER_SHORTCUT_MARKERS,
} from "@/lib/verify/rendered-quality-baseline";

const FORBIDDEN_PROCESS_LANGUAGE =
  RENDERED_QUALITY_PROCESS_LANGUAGE_PATTERNS.map((pattern) => pattern.source);

const CANONICAL_GLOSSARY_SLUGS = [
  "token",
  "vector",
  "hidden-size",
  "model",
  "architecture",
  "representation",
] as const;

const CANONICAL_MODULE_SLUGS = [
  "grouped-query-attention",
  "attention",
  "unigram-tokenizer",
] as const;

function assertNoProcessLanguage(text: string): void {
  for (const pattern of RENDERED_QUALITY_PROCESS_LANGUAGE_PATTERNS) {
    expect(text).not.toMatch(pattern);
  }
}

function assertNoReaderShortcutMarkers(html: string): void {
  for (const marker of RENDERED_QUALITY_READER_SHORTCUT_MARKERS) {
    expect(html).not.toContain(marker);
  }
  expect(html).not.toContain("Reader Shortcut");
}

describe("canonical content standards", () => {
  test("home browse cards omit customer-visible process language", async () => {
    const messages = await loadUiMessages();
    const serialized = JSON.stringify(messages.home);
    assertNoProcessLanguage(serialized);

    const html = renderToStaticMarkup(
      <HomeArticle messages={messages} siteConfig={modelAtlasSiteConfig} />,
    );
    assertNoProcessLanguage(html);
  });

  for (const slug of CANONICAL_MODULE_SLUGS) {
    test(`${slug} module page omits process language and reader shortcuts`, async () => {
      const page = await loadModulePage(slug);
      const serialized = JSON.stringify(page.messages);
      assertNoProcessLanguage(serialized);
      expect(page.messages.callouts).toBeUndefined();

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      assertNoProcessLanguage(html);
      assertNoReaderShortcutMarkers(html);
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain('data-testid="tag-pill-list"');
    });
  }

  for (const slug of CANONICAL_GLOSSARY_SLUGS) {
    test(`${slug} glossary page omits process language and reader shortcuts`, async () => {
      const page = await loadGlossaryPage(slug);
      const serialized = JSON.stringify(page.messages);
      assertNoProcessLanguage(serialized);
      expect(page.messages.callouts).toBeUndefined();

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      assertNoProcessLanguage(html);
      assertNoReaderShortcutMarkers(html);
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain('data-testid="tag-pill-list"');
    });
  }

  test("forbidden process-language patterns stay documented for rendered-quality audits", () => {
    expect(FORBIDDEN_PROCESS_LANGUAGE.length).toBeGreaterThan(0);
    expect(FORBIDDEN_PROCESS_LANGUAGE).toContain("Phase 1\\b");
    expect(FORBIDDEN_PROCESS_LANGUAGE).toContain("Phase 1 sample");
  });
});

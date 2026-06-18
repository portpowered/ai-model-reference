import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import {
  GLOSSARY_DOCS_ROOT,
  POSITIONAL_ENCODINGS_CONCEPT_PAGE_DIR,
} from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { expectGlossaryPresentationConvergence } from "@/lib/content/glossary-test-helpers";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";

const POSITIONAL_FAMILY_GLOSSARY_SLUGS = [
  "absolute-positional-embeddings",
  "relative-position-bias",
  "nope",
] as const;

describe("Phase 3 positional encoding family hub (US-001)", () => {
  test("hub registry record publishes curated links across absolute, relative, rotary, bias, and NoPE pages", () => {
    const record = getConceptById("concept.positional-encodings");
    expect(record?.status).toBe("published");
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "module.attention",
      "concept.absolute-positional-embeddings",
      "concept.relative-position-bias",
      "concept.rope",
      "concept.alibi",
      "concept.nope",
    ]);
    expect(record?.explainsIds).toEqual([
      "concept.absolute-positional-embeddings",
      "concept.relative-position-bias",
      "concept.rope",
      "concept.alibi",
      "concept.nope",
    ]);
  });

  test("curated related docs from the hub resolve to visible reader routes", () => {
    const source = getConceptById("concept.positional-encodings");
    if (!source) {
      throw new Error("expected concept.positional-encodings in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) => item.registryId === "concept.absolute-positional-embeddings",
      )?.href,
    ).toBe("/docs/glossary/absolute-positional-embeddings");
    expect(
      items.find((item) => item.registryId === "concept.relative-position-bias")
        ?.href,
    ).toBe("/docs/glossary/relative-position-bias");
    expect(items.find((item) => item.registryId === "concept.rope")?.href).toBe(
      "/docs/glossary/rope",
    );
    expect(
      items.find((item) => item.registryId === "concept.alibi")?.href,
    ).toBe("/docs/glossary/alibi");
    expect(items.find((item) => item.registryId === "concept.nope")?.href).toBe(
      "/docs/glossary/nope",
    );
  });

  test("hub page renders the family split and related links without dead ends", async () => {
    const page = await loadConceptPage("positional-encodings");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(page.messages.openingSummary?.toLowerCase()).toContain("absolute");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("relative");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "no-position",
    );
    expect(html).toContain("Family Split");
    expect(html).toContain(
      'href="/docs/glossary/absolute-positional-embeddings"',
    );
    expect(html).toContain('href="/docs/glossary/relative-position-bias"');
    expect(html).toContain('href="/docs/glossary/rope"');
    expect(html).toContain('href="/docs/glossary/alibi"');
    expect(html).toContain('href="/docs/glossary/nope"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });
});

describe("Phase 3 positional family glossary pages (US-001 dependencies)", () => {
  test("hub messages mention each branch in plain language", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(
        readFileSync(
          join(POSITIONAL_ENCODINGS_CONCEPT_PAGE_DIR, "messages/en.json"),
          "utf8",
        ),
      ),
    );

    expect(messages.sections?.simpleExample.title).toBe("Family Split");
    expect(messages.sections?.simpleExample.body).toContain(
      "/docs/glossary/absolute-positional-embeddings",
    );
    expect(messages.sections?.simpleExample.body).toContain(
      "/docs/glossary/relative-position-bias",
    );
    expect(messages.sections?.simpleExample.body).toContain(
      "/docs/glossary/rope",
    );
    expect(messages.sections?.simpleExample.body).toContain(
      "/docs/glossary/alibi",
    );
    expect(messages.sections?.simpleExample.body).toContain(
      "/docs/glossary/nope",
    );
  });

  for (const slug of POSITIONAL_FAMILY_GLOSSARY_SLUGS) {
    test(`${slug} glossary page compiles with localized sections and family links`, async () => {
      const messagesPath = join(GLOSSARY_DOCS_ROOT, slug, "messages/en.json");
      const messages = pageMessagesSchema.parse(
        JSON.parse(readFileSync(messagesPath, "utf8")),
      );
      expect(messages.openingSummary?.length).toBeGreaterThan(0);
      expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.simpleExample.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.commonConfusions.body?.length).toBeGreaterThan(
        0,
      );

      const page = await loadGlossaryPage(slug);
      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expectGlossaryPresentationConvergence(html, {
        title: page.messages.title,
      });
      expect(html).toContain('href="/docs/concepts/positional-encodings"');
      expect(html).toContain('href="/tags/foundations"');
    });
  }
});

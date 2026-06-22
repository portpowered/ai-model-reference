import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import {
  loadTagLandingContext,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";

const TOKENIZATION_TAG_SLUG = "tokenization";
const SENTENCEPIECE_URL = "/docs/modules/sentencepiece";

describe("sentencepiece tokenization discovery surfaces (sentencepiece-page-003)", () => {
  test("tokenization tag landing context and grouped resources point readers to SentencePiece", async () => {
    const messages = await loadUiMessages();
    const context = await loadTagLandingContext(
      TOKENIZATION_TAG_SLUG,
      messages,
      "en",
    );
    const groups = await loadTagResourceGroups(
      TOKENIZATION_TAG_SLUG,
      messages,
      "en",
    );
    const conceptGroup = groups.find((group) => group.kind === "concept");
    const moduleGroup = groups.find((group) => group.kind === "module");
    const trainingGroup = groups.find(
      (group) => group.kind === "training-regime",
    );

    expect(context?.title).toBe("Tokenization");
    expect(context?.summary.length).toBeGreaterThan(0);
    expect(context?.categoryLabel).toBe("Module type");
    expect(groups.map((group) => group.kind)).toEqual([
      "module",
      "concept",
      "training-regime",
      "glossary",
    ]);
    expect(moduleGroup?.kindLabel).toBe("Module");
    expect(conceptGroup?.kindLabel).toBe("Concept");
    expect(trainingGroup?.kindLabel).toBe("Training");
    expect(conceptGroup?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "concept",
          slug: "tokenizers-overview",
          title: "Tokenizers overview",
          url: "/docs/concepts/tokenizers-overview",
        }),
      ]),
    );
    expect(moduleGroup?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "module",
          slug: "sentencepiece",
          title: "SentencePiece",
          url: SENTENCEPIECE_URL,
        }),
      ]),
    );
    expect(trainingGroup?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "training-regime",
          slug: "pretraining",
          title: "Pretraining",
          url: "/docs/training/pretraining",
        }),
      ]),
    );
    expect(
      groups.find((group) => group.kind === "glossary")?.resources,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "glossary",
          slug: "special-tokens",
        }),
      ]),
    );
  });

  test("tokenization tag landing renders SentencePiece without empty-state placeholders", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: TOKENIZATION_TAG_SLUG }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Tokenization");
    expect(html).toContain("SentencePiece");
    expect(html).toContain(`href="${SENTENCEPIECE_URL}"`);
    expect(html).toContain('href="/search?tag=tokenization"');
    expect(html).toContain("data-search");
    expect(html).not.toContain("No resources");
    expect(html).not.toContain("Nothing has shipped");
  });

  test("search ranks SentencePiece first for the direct title query", async () => {
    const results = await docsSearchApi.search("SentencePiece");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SENTENCEPIECE_URL);
  });

  test.each([
    "sentence piece tokenizer",
    "multilingual tokenizer",
    "whitespace agnostic tokenizer",
  ] as const)("search returns SentencePiece as a direct top hit for %s", async (query) => {
    const results = await docsSearchApi.search(query);
    const topUrls = results.slice(0, 3).map((result) => result.url);

    expect(results.length).toBeGreaterThan(0);
    expect(topUrls).toContain(SENTENCEPIECE_URL);
  });
});

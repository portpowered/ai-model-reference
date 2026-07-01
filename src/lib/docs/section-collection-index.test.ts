import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderSectionCollectionIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import type { DocsCollectionDefinition } from "@/lib/docs/collection-definition-contract";
import { getDocsCollectionDefinition } from "@/lib/docs/docs-collection-definitions";
import {
  isDocsCollectionId,
  resolveDocsCollectionIndexMessages,
  resolveDocsCollectionInput,
  resolveSectionKindCollectionId,
} from "@/lib/docs/section-collection-index";

const trainingDefinition = getDocsCollectionDefinition("training");

describe("section collection index resolution", () => {
  test("resolves a collection id to the canonical definition", () => {
    expect(resolveDocsCollectionInput("models")).toEqual(
      getDocsCollectionDefinition("models"),
    );
  });

  test("accepts a full collection definition without re-resolving", () => {
    expect(resolveDocsCollectionInput(trainingDefinition)).toBe(
      trainingDefinition,
    );
  });

  test("rejects unknown collection ids with not-found behavior", () => {
    expect(isDocsCollectionId("unknown-collection")).toBe(false);

    try {
      resolveDocsCollectionInput("unknown-collection");
      throw new Error("Expected unknown collection id to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });

  test("maps section frontmatter kinds to collection ids", () => {
    expect(resolveSectionKindCollectionId("training-regime")).toBe("training");
    expect(resolveSectionKindCollectionId("model")).toBe("models");
  });

  test("resolves localized index copy from collection message metadata", async () => {
    const messages = await loadUiMessages();
    const modelsDefinition = getDocsCollectionDefinition("models");
    const resolved = resolveDocsCollectionIndexMessages(
      messages,
      modelsDefinition,
    );

    expect(resolved).toEqual(messages.modelsIndex);
    expect(
      resolveDocsCollectionIndexMessages(messages, trainingDefinition),
    ).toEqual(messages.trainingIndex);
  });

  test("resolves index copy from an inline collection definition", async () => {
    const messages = await loadUiMessages();
    const inlineDefinition: DocsCollectionDefinition = {
      ...trainingDefinition,
      starterSlugs: ["training/on-policy-distillation"],
    };

    expect(
      resolveDocsCollectionIndexMessages(messages, inlineDefinition),
    ).toEqual(messages.trainingIndex);
  });
});

describe("renderSectionCollectionIndexPage", () => {
  test("renders models index entries from a collection id", async () => {
    const html = renderToStaticMarkup(
      await renderSectionCollectionIndexPage("models"),
    );

    expect(html).toContain("Models");
    expect(html).toContain('href="/docs/models/gpt-3"');
  });

  test("renders training index entries using training-regime frontmatter kind", async () => {
    const html = renderToStaticMarkup(
      await renderSectionCollectionIndexPage("training"),
    );

    expect(html).toContain("Training");
    expect(html).toContain('href="/docs/training/on-policy-distillation"');
    expect(html).toContain('href="/docs/training/specialist-training"');
  });

  test("renders the same models output when passed the collection definition", async () => {
    const byId = renderToStaticMarkup(
      await renderSectionCollectionIndexPage("models"),
    );
    const byDefinition = renderToStaticMarkup(
      await renderSectionCollectionIndexPage(
        getDocsCollectionDefinition("models"),
      ),
    );

    expect(byDefinition).toBe(byId);
  });
});

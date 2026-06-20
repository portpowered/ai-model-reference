import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { TARGET_PATH_REGISTRY_IDS } from "@/lib/content/phase-2-token-probability-path-inventory";
import { loadRegistry } from "@/lib/content/registry";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { type ConceptRecord, pageMessagesSchema } from "@/lib/content/schemas";
import { validateRegistryContent } from "@/lib/content/validate-registry";

const TARGET_PATH_SLUGS = ["token", "embedding", "logit", "softmax"] as const;
const TOKEN_PROBABILITY_ALIGNMENT_TIMEOUT_MS = 15_000;

const INTERNAL_WORKFLOW_COPY =
  /convergence|manual gate|workflow status|phase \d/i;

function resolveTag(
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
  tagRef: string,
): boolean {
  const bySlug = indexes.bySlug.get(tagRef);
  if (bySlug?.kind === "tag") {
    return true;
  }
  const tagId = tagRef.startsWith("tag.") ? tagRef : `tag.${tagRef}`;
  return indexes.byId.get(tagId)?.kind === "tag";
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

describe("Phase 2 token-probability path registry alignment (phase-2-token-probability-path-convergence-003)", () => {
  test(
    "target-path pages align frontmatter with published concept registry records",
    async () => {
      const indexes = await loadRegistry();
      const pages = await loadPublishedDocsPages("en");

      for (const registryId of TARGET_PATH_REGISTRY_IDS) {
        const slug = registryId.replace("concept.", "");
        const page = pages.find(
          (entry) => entry.frontmatter.registryId === registryId,
        );
        const concept = indexes.byId.get(registryId) as
          | ConceptRecord
          | undefined;

        expect(page?.url).toBe(`/docs/glossary/${slug}`);
        expect(concept?.kind).toBe("concept");
        expect(concept?.status).toBe("published");
        expect(page?.frontmatter.kind).toBe("glossary");
        expect(page?.frontmatter.status).toBe("published");
        expect(page?.frontmatter.registryId).toBe(registryId);
        expect(
          arraysEqual(page?.frontmatter.aliases ?? [], concept?.aliases ?? []),
        ).toBe(true);
        expect(
          arraysEqual(page?.frontmatter.tags ?? [], concept?.tags ?? []),
        ).toBe(true);
      }
    },
    { timeout: TOKEN_PROBABILITY_ALIGNMENT_TIMEOUT_MS },
  );

  test(
    "target-path registry tags resolve to published tag records",
    async () => {
      const indexes = await loadRegistry();

      for (const registryId of TARGET_PATH_REGISTRY_IDS) {
        const concept = indexes.byId.get(registryId) as
          | ConceptRecord
          | undefined;
        expect(concept?.tags.length).toBeGreaterThan(0);

        for (const tagRef of concept?.tags ?? []) {
          expect(resolveTag(indexes, tagRef)).toBe(true);
        }
      }
    },
    { timeout: TOKEN_PROBABILITY_ALIGNMENT_TIMEOUT_MS },
  );

  test("token curated relatedIds expose tokenizer overview, special tokens, embedding, vocabulary size, logit, and softmax without prose-only links", () => {
    const token = getRegistryRecordById("concept.token");
    if (!token) {
      throw new Error("expected concept.token in registry runtime");
    }

    expect(token.relatedIds).toEqual([
      "module.byte-level-tokenization",
      "concept.special-tokens",
      "concept.tokenizers-overview",
      "concept.embedding",
      "concept.vocabulary-size",
      "concept.logit",
      "concept.softmax",
    ]);

    const items = deriveCuratedRelatedItems(
      token,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "module.byte-level-tokenization",
      "concept.special-tokens",
      "concept.tokenizers-overview",
      "concept.embedding",
      "concept.vocabulary-size",
      "concept.logit",
      "concept.softmax",
    ]);
    expect(
      items.find((item) => item.registryId === "module.byte-level-tokenization")
        ?.href,
    ).toBe("/docs/modules/byte-level-tokenization");
    expect(
      items.find((item) => item.registryId === "concept.special-tokens")?.href,
    ).toBe("/docs/glossary/special-tokens");
    expect(
      items.find((item) => item.registryId === "concept.tokenizers-overview")
        ?.href,
    ).toBe("/docs/concepts/tokenizers-overview");
    expect(
      items.find((item) => item.registryId === "concept.embedding")?.href,
    ).toBe("/docs/glossary/embedding");
    expect(
      items.find((item) => item.registryId === "concept.logit")?.href,
    ).toBe("/docs/glossary/logit");
    expect(
      items.find((item) => item.registryId === "concept.softmax")?.href,
    ).toBe("/docs/glossary/softmax");
    expect(
      items.find((item) => item.registryId === "concept.vocabulary-size")
        ?.href,
    ).toBe("/docs/glossary/vocabulary-size");
    expect(items.every((item) => item.isPlanned === false)).toBe(true);
  });

  test("target-path default-locale messages include glossary template keys", async () => {
    for (const slug of TARGET_PATH_SLUGS) {
      const messagesPath = join(GLOSSARY_DOCS_ROOT, slug, "messages/en.json");
      const messages = pageMessagesSchema.parse(
        JSON.parse(readFileSync(messagesPath, "utf8")),
      );

      expect(messages.title.length).toBeGreaterThan(0);
      expect(messages.openingSummary?.length).toBeGreaterThan(0);
      expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.related?.title?.length).toBeGreaterThan(0);
    }
  });

  test(
    "target-path customer-facing messages omit internal workflow copy",
    async () => {
      for (const slug of TARGET_PATH_SLUGS) {
        const page = await loadGlossaryPage(slug);
        const copy = JSON.stringify(page.messages);

        expect(copy).not.toMatch(INTERNAL_WORKFLOW_COPY);
        expect(page.messages.description).not.toMatch(INTERNAL_WORKFLOW_COPY);
      }
    },
    { timeout: TOKEN_PROBABILITY_ALIGNMENT_TIMEOUT_MS },
  );

  test(
    "registry validation passes after target-path alignment",
    async () => {
      const errors = await validateRegistryContent();
      expect(errors).toEqual([]);
    },
    { timeout: TOKEN_PROBABILITY_ALIGNMENT_TIMEOUT_MS },
  );
});

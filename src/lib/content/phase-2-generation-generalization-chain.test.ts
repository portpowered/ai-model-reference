import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  CURATED_RELATED,
  DERIVED_RELATED_DOC_GROUP_LABELS,
  deriveCuratedRelatedItems,
  deriveRelatedDocGroups,
  type RelatedDocItem,
  SAME_CONCEPT_TYPE,
  SHARED_TAGS,
} from "@/lib/content/related-docs";
import {
  type ConceptRecord,
  conceptRecordSchema,
  pageMessagesSchema,
} from "@/lib/content/schemas";
import { validateRegistryContent } from "@/lib/content/validate-registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

const FOUNDATION_CHAIN_SLUGS = [
  "patch",
  "latent",
  "latent-space",
  "encoder",
  "decoder",
  "encoder-decoder",
  "autoregressive-generation",
  "denoising-generation",
  "conditioning",
  "alignment",
  "model-capacity",
  "overfitting",
  "generalization",
  "perplexity",
  "scaling-law",
  "emergent-behavior",
] as const;

const FOUNDATION_CHAIN_URLS = FOUNDATION_CHAIN_SLUGS.map(
  (slug) => `/docs/glossary/${slug}`,
) as `/docs/glossary/${(typeof FOUNDATION_CHAIN_SLUGS)[number]}`[];

const FOUNDATION_CHAIN_CONCEPT_IDS = FOUNDATION_CHAIN_SLUGS.map(
  (slug) => `concept.${slug}`,
) as `concept.${(typeof FOUNDATION_CHAIN_SLUGS)[number]}`[];

const GENERATION_SLUGS = new Set([
  "autoregressive-generation",
  "denoising-generation",
  "conditioning",
]);

const EVALUATION_GENERALIZATION_SLUGS = new Set([
  "generalization",
  "overfitting",
  "alignment",
  "model-capacity",
  "perplexity",
  "scaling-law",
  "emergent-behavior",
]);

const DERIVED_GROUP_IDS = [
  SAME_CONCEPT_TYPE,
  SHARED_TAGS,
  CURATED_RELATED,
] as const;

const CLUSTER_REASON_LABEL_SAMPLES: {
  label: string;
  registryId: (typeof FOUNDATION_CHAIN_CONCEPT_IDS)[number];
  expectedGroupId: (typeof DERIVED_GROUP_IDS)[number];
  expectedPeerSlug: (typeof FOUNDATION_CHAIN_SLUGS)[number];
}[] = [
  {
    label: "representation cluster",
    registryId: "concept.patch",
    expectedGroupId: SHARED_TAGS,
    expectedPeerSlug: "latent",
  },
  {
    label: "encoder-decoder cluster",
    registryId: "concept.encoder",
    expectedGroupId: SAME_CONCEPT_TYPE,
    expectedPeerSlug: "decoder",
  },
  {
    label: "generation paradigm cluster",
    registryId: "concept.autoregressive-generation",
    expectedGroupId: SAME_CONCEPT_TYPE,
    expectedPeerSlug: "denoising-generation",
  },
  {
    label: "training behavior cluster",
    registryId: "concept.generalization",
    expectedGroupId: CURATED_RELATED,
    expectedPeerSlug: "overfitting",
  },
  {
    label: "evaluation cluster",
    registryId: "concept.perplexity",
    expectedGroupId: SAME_CONCEPT_TYPE,
    expectedPeerSlug: "scaling-law",
  },
];

function slugFromGlossaryHref(href: string): string {
  return href.replace("/docs/glossary/", "");
}

function collectPublishedRelatedItems(registryId: string): RelatedDocItem[] {
  const source = getRegistryRecordById(registryId);
  if (!source) {
    return [];
  }

  const candidates = listRelatedRegistryRecords();
  const publishedRegistryIds = PUBLISHED_DOCS_REGISTRY_IDS;
  const derived = deriveRelatedDocGroups(
    source,
    candidates,
    [...DERIVED_GROUP_IDS],
    publishedRegistryIds,
  ).flatMap((group) => group.items);
  const curated = deriveCuratedRelatedItems(
    source,
    candidates,
    publishedRegistryIds,
  );

  const byRegistryId = new Map<string, RelatedDocItem>();
  for (const item of [...derived, ...curated]) {
    if (item.href) {
      byRegistryId.set(item.registryId, item);
    }
  }
  return [...byRegistryId.values()];
}

function findPublishedHrefToSlug(
  registryId: string,
  matchesSlug: (slug: string) => boolean,
  preferredSlugs: string[] = [],
): string | undefined {
  const matches = collectPublishedRelatedItems(registryId).filter(
    (item) => item.href && matchesSlug(slugFromGlossaryHref(item.href)),
  );

  for (const preferred of preferredSlugs) {
    const preferredItem = matches.find((item) => item.slug === preferred);
    if (preferredItem?.href) {
      return preferredItem.href;
    }
  }

  return matches[0]?.href;
}

function assertConceptTemplateMessages(
  messages: ReturnType<typeof pageMessagesSchema.parse>,
): void {
  expect(messages.title.length).toBeGreaterThan(0);
  expect(messages.problemStatement?.length).toBeGreaterThan(0);
  expect(messages.coreIdea?.length).toBeGreaterThan(0);
  expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
  expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
  expect(messages.sections?.simpleExample.body?.length).toBeGreaterThan(0);
  expect(messages.description).not.toContain("Draft placeholder");
}

function resolveTag(
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
  tagRef: string,
): { id: string } | undefined {
  const bySlug = indexes.bySlug.get(tagRef);
  if (bySlug?.kind === "tag") {
    return bySlug;
  }
  const tagId = tagRef.startsWith("tag.") ? tagRef : `tag.${tagRef}`;
  const byId = indexes.byId.get(tagId);
  if (byId?.kind === "tag") {
    return byId;
  }
  return undefined;
}

describe("Phase 2 generation and generalization foundation chain (US-006)", () => {
  describe("route discovery", () => {
    test("published docs scanner includes all sixteen foundation glossary URLs", async () => {
      const pages = await loadPublishedDocsPages("en");
      const urls = pages.map((page) => page.url);

      for (const url of FOUNDATION_CHAIN_URLS) {
        expect(urls).toContain(url);
      }
    });

    test("each foundation slug has MDX content and a Fumadocs source entry", () => {
      for (const slug of FOUNDATION_CHAIN_SLUGS) {
        const pageMdx = join(GLOSSARY_DOCS_ROOT, slug, "page.mdx");
        expect(existsSync(pageMdx)).toBe(true);
        expect(source.getPage(["glossary", slug])).toBeDefined();
      }
    });
  });

  describe("registry validation", () => {
    test("validateRegistryContent passes for the full foundation chain", async () => {
      const errors = await validateRegistryContent();
      expect(errors).toEqual([]);
    });

    test("sixteen published foundation concepts pass conceptRecordSchema", async () => {
      for (const slug of FOUNDATION_CHAIN_SLUGS) {
        const raw = readFileSync(
          join(
            GLOSSARY_DOCS_ROOT,
            "..",
            "..",
            "registry",
            "concepts",
            `${slug}.json`,
          ),
          "utf8",
        );
        const concept = conceptRecordSchema.parse(JSON.parse(raw));
        expect(concept.id).toBe(`concept.${slug}`);
        expect(concept.status).toBe("published");
      }
    });

    test("foundation concept relationships and tags resolve in loadRegistry", async () => {
      const indexes = await loadRegistry();

      for (const id of FOUNDATION_CHAIN_CONCEPT_IDS) {
        const concept = indexes.byId.get(id) as ConceptRecord | undefined;
        expect(concept?.kind).toBe("concept");

        for (const tagRef of concept?.tags ?? []) {
          expect(resolveTag(indexes, tagRef)).toBeDefined();
        }

        for (const refId of [
          ...(concept?.relatedIds ?? []),
          ...(concept?.prerequisiteIds ?? []),
          ...(concept?.explainsIds ?? []),
        ]) {
          expect(indexes.byId.has(refId)).toBe(true);
        }
      }
    });

    test("draft forward targets in foundation relatedIds stay draft without published docs pages", async () => {
      const indexes = await loadRegistry();
      const encoderDecoder = indexes.byId.get("concept.encoder-decoder") as
        | ConceptRecord
        | undefined;
      expect(encoderDecoder?.relatedIds).toContain("concept.transformer");

      const transformer = indexes.byId.get("concept.transformer");
      expect(transformer?.status).toBe("draft");
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.transformer")).toBe(
        false,
      );
    });
  });

  describe("localized messages", () => {
    for (const slug of FOUNDATION_CHAIN_SLUGS) {
      test(`${slug} colocated messages resolve required concept template keys`, async () => {
        const messagesPath = join(GLOSSARY_DOCS_ROOT, slug, "messages/en.json");
        const messages = pageMessagesSchema.parse(
          JSON.parse(readFileSync(messagesPath, "utf8")),
        );
        assertConceptTemplateMessages(messages);

        const page = await loadGlossaryPage(slug);
        expect(page.messages.title).toBe(messages.title);
        expect(page.frontmatter.registryId).toBe(`concept.${slug}`);
      });
    }
  });

  describe("search indexing", () => {
    test("indexes representative foundation pages with glossary kind, tags, title, and URL", async () => {
      const registry = await loadRegistry();
      const pages = await loadPublishedDocsPages("en");
      const documents = buildSearchDocuments(pages, registry);

      const tagExpectations: Record<
        (typeof FOUNDATION_CHAIN_SLUGS)[number],
        string
      > = {
        patch: "taxonomy",
        latent: "foundations",
        "latent-space": "taxonomy",
        encoder: "foundations",
        decoder: "taxonomy",
        "encoder-decoder": "foundations",
        "autoregressive-generation": "attention",
        "denoising-generation": "taxonomy",
        conditioning: "foundations",
        alignment: "taxonomy",
        "model-capacity": "foundations",
        overfitting: "taxonomy",
        generalization: "foundations",
        perplexity: "taxonomy",
        "scaling-law": "foundations",
        "emergent-behavior": "taxonomy",
      };

      for (const slug of FOUNDATION_CHAIN_SLUGS) {
        const url = `/docs/glossary/${slug}`;
        const document = documents.find((entry) => entry.url === url);
        const page = await loadGlossaryPage(slug);

        expect(document).toBeDefined();
        expect(document?.title).toBe(page.messages.title);
        expect(document?.kind).toBe("glossary");
        expect(document?.facets.kind).toBe("glossary");
        expect(document?.url).toBe(url);
        expect(document?.registryId).toBe(`concept.${slug}`);
        expect(document?.tags).toEqual(
          expect.arrayContaining([tagExpectations[slug]]),
        );
        expect(document?.description.length).toBeGreaterThan(0);
      }
    });

    test("cross-chain search finds encoder, autoregressive, generalization, and perplexity", async () => {
      const encoderResults = await docsSearchApi.search("encoding network");
      expect(
        encoderResults.some(
          (result) => result.url === "/docs/glossary/encoder",
        ),
      ).toBe(true);

      const autoregressiveResults = await docsSearchApi.search(
        "next-token generation",
      );
      expect(
        autoregressiveResults.some(
          (result) => result.url === "/docs/glossary/autoregressive-generation",
        ),
      ).toBe(true);

      const generalizationResults = await docsSearchApi.search(
        "held-out performance",
      );
      expect(
        generalizationResults.some(
          (result) => result.url === "/docs/glossary/generalization",
        ),
      ).toBe(true);

      const perplexityResults = await docsSearchApi.search("PPL");
      expect(
        perplexityResults.some(
          (result) => result.url === "/docs/glossary/perplexity",
        ),
      ).toBe(true);
    });
  });

  describe("registry-derived traversal", () => {
    test("walks architecture to generation to evaluation via published related-doc hrefs", () => {
      const traversal: string[] = ["architecture"];

      const generationHref = findPublishedHrefToSlug(
        "concept.architecture",
        (slug) => GENERATION_SLUGS.has(slug),
      );
      expect(generationHref).toBeDefined();
      const generationSlug = slugFromGlossaryHref(generationHref ?? "");
      traversal.push(generationSlug);

      const evaluationHref = findPublishedHrefToSlug(
        `concept.${generationSlug}`,
        (slug) => EVALUATION_GENERALIZATION_SLUGS.has(slug),
        ["generalization", "perplexity", "scaling-law", "emergent-behavior"],
      );
      expect(evaluationHref).toBeDefined();
      traversal.push(slugFromGlossaryHref(evaluationHref ?? ""));

      expect(traversal).toEqual([
        "architecture",
        "autoregressive-generation",
        "generalization",
      ]);
    });
  });

  describe("related docs reason labels", () => {
    for (const sample of CLUSTER_REASON_LABEL_SAMPLES) {
      test(`${sample.label} surfaces ${sample.expectedPeerSlug} with ${sample.expectedGroupId} reason label`, () => {
        const source = getRegistryRecordById(sample.registryId);
        if (!source) {
          throw new Error(`expected ${sample.registryId} in registry runtime`);
        }

        const groups = deriveRelatedDocGroups(
          source,
          listRelatedRegistryRecords(),
          [...DERIVED_GROUP_IDS],
          PUBLISHED_DOCS_REGISTRY_IDS,
        );
        const group = groups.find(
          (entry) => entry.id === sample.expectedGroupId,
        );
        expect(group).toBeDefined();

        const peer = group?.items.find(
          (item) => item.slug === sample.expectedPeerSlug && item.href,
        );
        expect(peer).toBeDefined();
        expect(peer?.reasonLabel).toBe(
          DERIVED_RELATED_DOC_GROUP_LABELS[sample.expectedGroupId],
        );
      });
    }
  });
});

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { validateRegistryContent } from "@/lib/content/validate-registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const TAXONOMY_GLOSSARY_SLUGS = [
  "model",
  "architecture",
  "module",
  "component",
  "modality",
  "foundation-model",
  "generative-model",
  "discriminative-model",
  "representation",
] as const;

const TAXONOMY_GLOSSARY_URLS = TAXONOMY_GLOSSARY_SLUGS.map(
  (slug) => `/docs/glossary/${slug}`,
) as `/docs/glossary/${(typeof TAXONOMY_GLOSSARY_SLUGS)[number]}`[];

const DRAFT_FORWARD_TARGET_IDS = [
  "concept.transformer",
  "concept.diffusion-model",
  "concept.multimodal-model",
  "concept.world-model",
] as const;

const MESSAGE_KEY_PAGES = ["model", "architecture"] as const;

function assertConceptTemplateMessages(
  messages: ReturnType<typeof pageMessagesSchema.parse>,
): void {
  expect(messages.title.length).toBeGreaterThan(0);
  expect(messages.problemStatement?.length).toBeGreaterThan(0);
  expect(messages.coreIdea?.length).toBeGreaterThan(0);
  expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
  expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
  expect(messages.sections?.simpleExample.body?.length).toBeGreaterThan(0);
}

describe("Phase 2 taxonomy discovery (US-009)", () => {
  describe("route discovery", () => {
    test("published docs scanner includes all nine taxonomy glossary URLs", async () => {
      const pages = await loadPublishedDocsPages("en");
      const urls = pages.map((page) => page.url);

      for (const url of TAXONOMY_GLOSSARY_URLS) {
        expect(urls).toContain(url);
      }
    });

    test("each taxonomy glossary slug has MDX content and an App Router page", () => {
      for (const slug of TAXONOMY_GLOSSARY_SLUGS) {
        const pageMdx = join(GLOSSARY_DOCS_ROOT, slug, "page.mdx");
        const routePath = join(
          process.cwd(),
          `src/app/docs/glossary/${slug}/page.tsx`,
        );
        expect(existsSync(pageMdx)).toBe(true);
        expect(existsSync(routePath)).toBe(true);
      }
    });
  });

  describe("localized messages", () => {
    for (const slug of MESSAGE_KEY_PAGES) {
      test(`${slug} colocated messages/en.json resolves required concept template keys`, async () => {
        const messagesPath = join(GLOSSARY_DOCS_ROOT, slug, "messages/en.json");
        const messages = pageMessagesSchema.parse(
          JSON.parse(readFileSync(messagesPath, "utf8")),
        );
        assertConceptTemplateMessages(messages);

        const page = await loadGlossaryPage(slug);
        expect(page.messages.title).toBe(messages.title);
        expect(page.messages.coreIdea).toBe(messages.coreIdea);
        expect(page.frontmatter.registryId).toBe(`concept.${slug}`);
      });
    }

    test("architecture messages include upcoming model families callout keys", () => {
      const messagesPath = join(
        GLOSSARY_DOCS_ROOT,
        "architecture",
        "messages/en.json",
      );
      const messages = pageMessagesSchema.parse(
        JSON.parse(readFileSync(messagesPath, "utf8")),
      );

      expect(
        messages.callouts?.upcomingModelFamilies?.title?.length,
      ).toBeGreaterThan(0);
      expect(
        messages.callouts?.upcomingModelFamilies?.body?.length,
      ).toBeGreaterThan(0);
    });
  });

  describe("registry validation", () => {
    test("validateRegistryContent passes with taxonomy relatedIds and draft forward targets", async () => {
      const errors = await validateRegistryContent();
      expect(errors).toEqual([]);
    });

    test("architecture relatedIds reference all four draft forward targets", async () => {
      const indexes = await loadRegistry();
      const architecture = indexes.byId.get("concept.architecture");
      expect(architecture?.kind).toBe("concept");

      for (const id of DRAFT_FORWARD_TARGET_IDS) {
        expect(architecture?.relatedIds).toContain(id);
        expect(indexes.byId.get(id)?.status).toBe("draft");
      }
    });
  });

  describe("search indexing", () => {
    test("indexes all nine taxonomy pages with glossary kind, tags, aliases, and body text", async () => {
      const registry = await loadRegistry();
      const pages = await loadPublishedDocsPages("en");
      const documents = buildSearchDocuments(pages, registry);

      const searchExpectations: Record<
        (typeof TAXONOMY_GLOSSARY_SLUGS)[number],
        { alias: string; bodySnippet: string }
      > = {
        model: {
          alias: "ML model",
          bodySnippet: "trained artifact",
        },
        architecture: {
          alias: "model architecture",
          bodySnippet: "structural recipe",
        },
        module: {
          alias: "model module",
          bodySnippet: "reusable unit",
        },
        component: {
          alias: "model component",
          bodySnippet: "sub-part of a module",
        },
        modality: {
          alias: "data modality",
          bodySnippet: "data channel",
        },
        "foundation-model": {
          alias: "foundation models",
          bodySnippet: "pretrained at scale",
        },
        "generative-model": {
          alias: "generative models",
          bodySnippet: "learns a distribution",
        },
        "discriminative-model": {
          alias: "discriminative models",
          bodySnippet: "estimates p(label",
        },
        representation: {
          alias: "latent representation",
          bodySnippet: "internal form",
        },
      };

      for (const slug of TAXONOMY_GLOSSARY_SLUGS) {
        const url = `/docs/glossary/${slug}`;
        const document = documents.find((entry) => entry.url === url);
        const expected = searchExpectations[slug];

        expect(document).toBeDefined();
        expect(document?.kind).toBe("glossary");
        expect(document?.facets.kind).toBe("glossary");
        expect(document?.registryId).toBe(`concept.${slug}`);
        expect(document?.tags).toEqual(
          expect.arrayContaining(["taxonomy", "foundations"]),
        );
        expect(document?.aliases).toEqual(
          expect.arrayContaining([expected.alias]),
        );
        expect(document?.bodyText).toContain(expected.bodySnippet);
        expect(document?.description.length).toBeGreaterThan(0);
      }
    });
  });
});

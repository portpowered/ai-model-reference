/**
 * Regression coverage proving Model Atlas AI browse, section index, sidebar, and
 * search behavior stayed stable while the generic shell primitives and non-AI
 * fixture proof landed. Fixture routes must stay off public AI surfaces.
 */
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  renderBrowseIndexPage,
  renderSectionKindIndexPage,
} from "@/app/(site)/site-renderers";
import { GET } from "@/app/api/search/route";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { DOCS_BROWSE_COLLECTION_IDS } from "@/lib/docs/browse-collection-sections";
import {
  collectSidebarPageLinks,
  DEEPSEEK_V4_PAPER_URL,
  GPT_3_MODEL_URL,
  GROUPED_QUERY_ATTENTION_URL,
  ROUTING_SYSTEM_URL,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";
import { resultsIncludeUrl, SAMPLE_MODULE_URL } from "@/tests/search/helpers";
import {
  listNonAiShellFixturePages,
  NON_AI_SHELL_FIXTURE_MESSAGES,
  NON_AI_SHELL_FIXTURE_URL_PREFIX,
} from "./fixture";

const AI_BROWSE_SECTION_LABELS = [
  "Models",
  "Model Types",
  "Modules",
  "Concepts",
  "Inference",
  "Papers",
  "Training",
  "Systems",
  "Glossary",
] as const;

const AI_BROWSE_STARTER_HREFS = [
  "/docs/models/gpt-3",
  "/docs/glossary/world-model",
  "/docs/modules/grouped-query-attention",
  "/docs/concepts/transformer-architecture",
  "/docs/glossary/temperature",
  "/docs/papers/deepseek-v4",
  "/docs/training/on-policy-distillation",
  "/docs/systems/deployment",
  "/docs/glossary/token",
] as const;

const AI_BROWSE_HEADING_IDS = [
  "models-heading",
  "model-types-heading",
  "modules-heading",
  "concepts-heading",
  "inference-heading",
  "papers-heading",
  "training-heading",
  "systems-heading",
  "glossary-heading",
] as const;

const AI_SIDEBAR_FOLDER_NAMES = [
  "Model Types",
  "Inference",
  "Glossary",
  "Concepts",
  "Modules",
  "Models",
  "Papers",
  "Training",
  "Systems",
] as const;

const AI_SECTION_INDEX_CASES = [
  {
    kind: "model" as const,
    title: "Models",
    hrefs: [GPT_3_MODEL_URL],
  },
  {
    kind: "module" as const,
    title: "Modules",
    hrefs: [GROUPED_QUERY_ATTENTION_URL, "/docs/modules/swiglu"],
  },
  {
    kind: "concept" as const,
    title: "Concepts",
    hrefs: [
      "/docs/concepts/transformer-architecture",
      "/docs/concepts/quantization",
    ],
  },
  {
    kind: "paper" as const,
    title: "Papers",
    hrefs: [DEEPSEEK_V4_PAPER_URL],
  },
  {
    kind: "training-regime" as const,
    title: "Training",
    hrefs: [
      "/docs/training/on-policy-distillation",
      "/docs/training/specialist-training",
    ],
  },
  {
    kind: "system" as const,
    title: "Systems",
    hrefs: [
      "/docs/systems/deployment",
      ROUTING_SYSTEM_URL,
      "/docs/systems/batching",
    ],
  },
] as const;

const GQA_URL = SAMPLE_MODULE_URL;
const RELU_URL = "/docs/modules/relu";
const LEAKY_RELU_URL = "/docs/modules/leaky-relu";

function headingIdPosition(html: string, headingId: string): number {
  const position = html.indexOf(`id="${headingId}"`);
  expect(position).toBeGreaterThanOrEqual(0);
  return position;
}

function getTopLevelFolderNames(): string[] {
  return source.pageTree.children
    .filter((node) => node.type === "folder")
    .map((folder) => String(folder.name));
}

describe("AI shell behavior parity after non-AI fixture proof", () => {
  describe("browse index", () => {
    test("keeps collection section order and representative starter entries", async () => {
      const html = renderToStaticMarkup(await renderBrowseIndexPage());

      for (const label of AI_BROWSE_SECTION_LABELS) {
        expect(html).toContain(label);
      }

      const headingPositions = AI_BROWSE_HEADING_IDS.map((headingId) =>
        headingIdPosition(html, headingId),
      );
      for (let index = 1; index < headingPositions.length; index += 1) {
        expect(headingPositions[index]).toBeGreaterThan(
          headingPositions[index - 1],
        );
      }

      for (const href of AI_BROWSE_STARTER_HREFS) {
        expect(html).toContain(`href="${href}"`);
      }

      expect(DOCS_BROWSE_COLLECTION_IDS).toEqual([
        "models",
        "modules",
        "concepts",
        "papers",
        "training",
        "systems",
        "glossary",
      ]);
    });
  });

  describe("section indexes", () => {
    for (const section of AI_SECTION_INDEX_CASES) {
      test(`renders ${section.title.toLowerCase()} index entries at current URLs`, async () => {
        const html = renderToStaticMarkup(
          await renderSectionKindIndexPage(section.kind),
        );

        expect(html).toContain(section.title);
        for (const href of section.hrefs) {
          expect(html).toContain(`href="${href}"`);
        }
      });
    }
  });

  describe("sidebar page tree", () => {
    test("keeps top-level folder order and representative links", () => {
      expect(getTopLevelFolderNames()).toEqual([...AI_SIDEBAR_FOLDER_NAMES]);

      const links = collectSidebarPageLinks(source.pageTree);
      expect(links).toEqual(
        expect.arrayContaining([
          { name: "Token", url: TOKEN_GLOSSARY_URL },
          { name: "GPT-3", url: GPT_3_MODEL_URL },
          {
            name: "Grouped-Query Attention",
            url: GROUPED_QUERY_ATTENTION_URL,
          },
          { name: "DeepSeek-V4", url: DEEPSEEK_V4_PAPER_URL },
        ]),
      );

      const sidebarJson = JSON.stringify(source.pageTree);
      expect(sidebarJson).toContain("Attention Variants");
      expect(sidebarJson).toContain("Long Context");
      expect(sidebarJson).toContain("Alignment");
      expect(sidebarJson).toContain("Routing");
    });
  });

  describe("search behavior", () => {
    test("attention query still returns grouped-query attention", async () => {
      const results = await docsSearchApi.search("attention");
      expect(results.length).toBeGreaterThan(0);
      expect(resultsIncludeUrl(results, GQA_URL)).toBe(true);
    });

    test("GQA query still ranks grouped-query attention first", async () => {
      const results = await docsSearchApi.search("GQA");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.url).toBe(GQA_URL);
    });

    test("activation classification still returns activation-family modules", async () => {
      const response = await GET(
        new Request("http://localhost/api/search?classification=activation"),
      );
      expect(response.ok).toBe(true);

      const results = (await response.json()) as Array<{ url: string }>;
      const urls = results.map((result) => result.url);
      expect(urls).toEqual(expect.arrayContaining([RELU_URL, LEAKY_RELU_URL]));
    });
  });

  describe("fixture isolation from public AI surfaces", () => {
    test("does not expose fixture routes through browse, sidebar, or search catalogs", async () => {
      const browseHtml = renderToStaticMarkup(await renderBrowseIndexPage());
      const sidebarUrls = collectSidebarPageLinks(source.pageTree).map(
        (link) => link.url,
      );
      const registry = await loadRegistry();
      const pages = await loadPublishedDocsPages("en");
      const searchUrls = buildSearchDocuments(pages, registry).map(
        (document) => document.url,
      );
      const fixtureUrls = listNonAiShellFixturePages().map((page) => page.url);

      expect(browseHtml).not.toContain(NON_AI_SHELL_FIXTURE_URL_PREFIX);
      expect(browseHtml).not.toContain(
        NON_AI_SHELL_FIXTURE_MESSAGES.browseIndex.guidesSectionTitle,
      );
      expect(browseHtml).not.toContain(
        NON_AI_SHELL_FIXTURE_MESSAGES.browseIndex.referenceSectionTitle,
      );

      for (const fixtureUrl of fixtureUrls) {
        expect(sidebarUrls).not.toContain(fixtureUrl);
        expect(searchUrls).not.toContain(fixtureUrl);
      }
    });
  });
});

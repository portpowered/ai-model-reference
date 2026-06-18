import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import TagsIndexPage from "@/app/(site)/tags/page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import {
  loadTagLandingContext,
  loadTagResourceEntries,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import { loadPublishedTagIndexEntries } from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";

const FOUNDATIONAL_TAG_SLUGS = [
  "foundations",
  "taxonomy",
  "model-family",
  "token-to-probability-chain",
] as const;

/** Batch 017 pages expected on each foundational tag landing (see prd.md). */
const BATCH_017_TAG_URLS = {
  foundations: [
    "/docs/concepts/context-extension",
    "/docs/concepts/positional-encodings",
    "/docs/concepts/transformer-architecture",
    "/docs/concepts/why-long-context-is-hard",
    "/docs/glossary/alibi",
    "/docs/glossary/context-window",
    "/docs/glossary/feed-forward-network",
    "/docs/glossary/layer-norm",
    "/docs/glossary/leaky-relu",
    "/docs/glossary/mixture-of-experts",
    "/docs/glossary/normalization",
    "/docs/glossary/relu",
    "/docs/glossary/residual-connection",
    "/docs/glossary/rmsnorm",
    "/docs/glossary/silu",
    "/docs/glossary/rope",
    "/docs/glossary/standard-ffn",
    "/docs/glossary/swiglu",
  ],
  taxonomy: [
    "/docs/concepts/transformer-architecture",
    "/docs/glossary/diffusion-model",
    "/docs/glossary/multimodal-model",
    "/docs/glossary/transformer",
    "/docs/glossary/world-model",
  ],
  "model-family": [
    "/docs/glossary/diffusion-model",
    "/docs/glossary/multimodal-model",
    "/docs/glossary/transformer",
    "/docs/glossary/world-model",
  ],
  "token-to-probability-chain": [],
} as const;

function pageMatchesTag(
  page: Awaited<ReturnType<typeof loadPublishedDocsPages>>[number],
  tagSlug: string,
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
): boolean {
  if (page.frontmatter.tags.includes(tagSlug)) {
    return true;
  }
  const record = indexes.byId.get(page.frontmatter.registryId);
  return record?.tags.includes(tagSlug) ?? false;
}

describe("Phase 2/3 reconciliation foundational tags (US-006)", () => {
  test("foundational tag records expose localized title and summary", async () => {
    const messages = await loadUiMessages();

    const foundations = await loadTagLandingContext(
      "foundations",
      messages,
      "en",
    );
    expect(foundations?.title).toBe("Foundations");
    expect(foundations?.summary.length).toBeGreaterThan(0);
    expect(foundations?.categoryLabel).toBe("Architecture");

    const taxonomy = await loadTagLandingContext("taxonomy", messages, "en");
    expect(taxonomy?.title).toBe("Taxonomy");
    expect(taxonomy?.summary.length).toBeGreaterThan(0);

    const modelFamily = await loadTagLandingContext(
      "model-family",
      messages,
      "en",
    );
    expect(modelFamily?.title).toBe("Model family");
    expect(modelFamily?.summary).toContain(
      "Published model-family glossary pages",
    );
    expect(modelFamily?.categoryLabel).toBe("Model family");

    const tokenChain = await loadTagLandingContext(
      "token-to-probability-chain",
      messages,
      "en",
    );
    expect(tokenChain?.title).toBe("Token-to-probability chain");
    expect(tokenChain?.summary.length).toBeGreaterThan(0);
  });

  test("foundational tag landings include every batch 017 associated page", async () => {
    const messages = await loadUiMessages();

    for (const tagSlug of FOUNDATIONAL_TAG_SLUGS) {
      const entries = await loadTagResourceEntries(tagSlug, "en");
      const urls = new Set(entries.map((entry) => entry.url));

      for (const url of BATCH_017_TAG_URLS[tagSlug]) {
        expect(urls).toContain(url);
      }
    }

    const modelFamilyGroups = await loadTagResourceGroups(
      "model-family",
      messages,
      "en",
    );
    expect(modelFamilyGroups).toHaveLength(1);
    expect(modelFamilyGroups[0]?.kind).toBe("glossary");
    expect(modelFamilyGroups[0]?.kindLabel).toBe("Glossary");
    expect(
      modelFamilyGroups[0]?.resources.map((resource) => resource.url),
    ).toEqual([
      "/docs/glossary/diffusion-model",
      "/docs/glossary/multimodal-model",
      "/docs/glossary/transformer",
      "/docs/glossary/world-model",
    ]);
  });

  test("foundational tag landings omit empty kind groups and sort resources by title", async () => {
    const messages = await loadUiMessages();

    for (const tagSlug of FOUNDATIONAL_TAG_SLUGS) {
      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      expect(groups.every((group) => group.resources.length > 0)).toBe(true);

      for (const group of groups) {
        const titles = group.resources.map((resource) => resource.title);
        const sorted = [...titles].sort((a, b) =>
          a.localeCompare(b, "en", { sensitivity: "base" }),
        );
        expect(titles).toEqual(sorted);
      }
    }
  });

  test("published pages with foundational tags resolve through registry or frontmatter", async () => {
    const pages = await loadPublishedDocsPages("en");
    const indexes = await loadRegistry();

    for (const tagSlug of FOUNDATIONAL_TAG_SLUGS) {
      const taggedPages = pages.filter((page) =>
        pageMatchesTag(page, tagSlug, indexes),
      );
      const entryUrls = new Set(
        (await loadTagResourceEntries(tagSlug, "en")).map((entry) => entry.url),
      );

      for (const page of taggedPages) {
        expect(entryUrls).toContain(page.url);
      }
    }
  });

  test("tags index links foundational tags with accurate descriptions", async () => {
    const messages = await loadUiMessages();
    const entries = await loadPublishedTagIndexEntries(messages, "en");

    for (const slug of FOUNDATIONAL_TAG_SLUGS) {
      const entry = entries.find((candidate) => candidate.slug === slug);
      expect(entry).toBeDefined();
      expect(entry?.url).toBe(`/tags/${slug}`);
      expect(entry?.summary.length).toBeGreaterThan(0);
    }

    const modelFamily = entries.find((entry) => entry.slug === "model-family");
    expect(modelFamily?.summary).toContain(
      "Published model-family glossary pages",
    );
  });
});

describe("Phase 2/3 reconciliation foundational tag page render (US-006)", () => {
  test("foundations landing lists batch 017 resources grouped by kind", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "foundations" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Foundations");
    expect(html).toContain("Glossary");
    expect(html).toContain("Concept");
    expect(html).toContain('href="/docs/glossary/rope"');
    expect(html).toContain('href="/docs/glossary/context-window"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/search?tag=foundations"');
    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });

  test("model-family landing lists all four published model family glossary pages", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "model-family" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Model family");
    expect(html).toContain("Published model-family glossary pages");
    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/glossary/world-model"');
    expect(html).toContain('href="/search?tag=model-family"');
  });

  test("tags index renders foundational tag entries with landing links", async () => {
    const page = await TagsIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Foundations");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain("Taxonomy");
    expect(html).toContain('href="/tags/taxonomy"');
    expect(html).toContain("Model family");
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain("Token-to-probability chain");
    expect(html).toContain('href="/tags/token-to-probability-chain"');
  });
});

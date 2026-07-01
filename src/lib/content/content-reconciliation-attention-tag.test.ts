import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  loadPhase1AttentionModuleUrls,
  PHASE_1_ATTENTION_TAG_SLUG,
  publishedResourceMatchesTag,
} from "@/lib/content/phase-1-published-resources";
import { loadRegistry } from "@/lib/content/registry";
import {
  loadTagLandingContext,
  loadTagResourceEntries,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";

const ATTENTION_TAG_SLUG = PHASE_1_ATTENTION_TAG_SLUG;

describe("Phase 2/3 reconciliation attention tag landing (US-007)", () => {
  test("attention tag record exposes localized title, summary, and module-type category", async () => {
    const messages = await loadUiMessages();
    const context = await loadTagLandingContext(
      ATTENTION_TAG_SLUG,
      messages,
      "en",
    );

    expect(context?.title).toBe("Attention");
    expect(context?.summary.length).toBeGreaterThan(0);
    expect(context?.categoryLabel).toBe("Module type");
  });

  test("attention tag landing lists every published attention module under Module", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      ATTENTION_TAG_SLUG,
      messages,
      "en",
    );
    const moduleGroup = groups.find((group) => group.kind === "module");
    const expectedModuleUrls = await loadPhase1AttentionModuleUrls("en");

    expect(moduleGroup).toBeDefined();
    expect(moduleGroup?.kindLabel).toBe("Module");
    expect(moduleGroup?.resources.map((resource) => resource.url)).toEqual(
      expectedModuleUrls,
    );
    expect(
      moduleGroup?.resources.every((resource) => resource.kind === "module"),
    ).toBe(true);
  });

  test("attention tag landing omits empty kind groups and sorts resources by title", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      ATTENTION_TAG_SLUG,
      messages,
      "en",
    );

    expect(groups.every((group) => group.resources.length > 0)).toBe(true);

    for (const group of groups) {
      const titles = group.resources.map((resource) => resource.title);
      const sorted = [...titles].sort((a, b) =>
        a.localeCompare(b, "en", { sensitivity: "base" }),
      );
      expect(titles).toEqual(sorted);
    }
  });

  test("non-module attention-tagged resources appear in separate kind groups", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      ATTENTION_TAG_SLUG,
      messages,
      "en",
    );

    expect(groups.map((group) => group.kind)).toEqual([
      "model",
      "module",
      "concept",
      "paper",
      "glossary",
    ]);

    const modelGroup = groups.find((group) => group.kind === "model");
    expect(modelGroup?.kindLabel).toBe("Model");
    expect(modelGroup?.resources.map((resource) => resource.url)).toEqual([
      "/docs/models/deepseek-v4-flash",
      "/docs/models/deepseek-v4-pro",
      "/docs/models/glm-5",
      "/docs/models/glm-5-2",
      "/docs/models/gpt-3",
      "/docs/models/llama-3",
      "/docs/models/mixtral-8x22b",
      "/docs/models/mixtral-8x7b",
      "/docs/models/qwen3-5-0-8b",
      "/docs/models/qwen-3-6-27b",
      "/docs/models/qwen-3-6-35b-a3b",
    ]);

    const conceptGroup = groups.find((group) => group.kind === "concept");
    expect(conceptGroup?.kindLabel).toBe("Concept");
    expect(conceptGroup?.resources.map((resource) => resource.url)).toEqual([
      "/docs/concepts/kv-cache",
      "/docs/concepts/prefill",
    ]);

    const paperGroup = groups.find((group) => group.kind === "paper");
    expect(paperGroup?.kindLabel).toBe("Paper");
    expect(paperGroup?.resources.map((resource) => resource.url)).toEqual([
      "/docs/papers/attention-is-all-you-need",
      "/docs/papers/deepseek-v4",
    ]);

    const glossaryGroup = groups.find((group) => group.kind === "glossary");
    expect(glossaryGroup?.kindLabel).toBe("Glossary");
    expect(glossaryGroup?.resources.map((resource) => resource.url)).toEqual([
      "/docs/glossary/autoregressive-generation",
      "/docs/glossary/decode",
      "/docs/glossary/kv-cache",
      "/docs/glossary/token",
    ]);
  });

  test("published pages with attention tag resolve through registry or frontmatter", async () => {
    const pages = await loadPublishedDocsPages("en");
    const indexes = await loadRegistry();
    const taggedPages = pages.filter((page) =>
      publishedResourceMatchesTag(page, ATTENTION_TAG_SLUG, indexes),
    );
    const entryUrls = new Set(
      (await loadTagResourceEntries(ATTENTION_TAG_SLUG, "en")).map(
        (entry) => entry.url,
      ),
    );
    const expectedModuleUrls = await loadPhase1AttentionModuleUrls("en");

    for (const page of taggedPages) {
      expect(entryUrls).toContain(page.url);
    }

    for (const url of expectedModuleUrls) {
      expect(entryUrls).toContain(url);
    }
  });
});

describe("Phase 2/3 reconciliation attention tag page render (US-007)", () => {
  test("attention landing lists all modules with search handoff to /search?tag=attention", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: ATTENTION_TAG_SLUG }),
    });
    const html = renderToStaticMarkup(page);
    const expectedModuleUrls = await loadPhase1AttentionModuleUrls("en");

    expect(html).toContain("Attention");
    expect(html).toContain("Module");
    expect(html).toContain("Concept");
    expect(html).toContain("Glossary");
    expect(html).toContain('href="/search?tag=attention"');
    expect(html).toContain("data-search");
    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");

    for (const url of expectedModuleUrls) {
      expect(html).toContain(`href="${url}"`);
    }

    expect(html).toContain("Linear Attention");
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/glossary/token"');
  });
});

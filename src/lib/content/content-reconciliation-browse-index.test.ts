import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";

/** Batch 017 glossary pages reconciled in Phase 2/3 (see prd.md). */
const BATCH_017_GLOSSARY_URLS = [
  "/docs/glossary/transformer",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/world-model",
  "/docs/glossary/feed-forward-network",
  "/docs/glossary/batch-norm",
  "/docs/glossary/group-norm",
  "/docs/glossary/standard-ffn",
  "/docs/glossary/mixture-of-experts",
  "/docs/glossary/relu",
  "/docs/glossary/leaky-relu",
  "/docs/glossary/silu",
  "/docs/glossary/swiglu",
  "/docs/glossary/normalization",
  "/docs/glossary/qk-norm",
  "/docs/glossary/layer-norm",
  "/docs/glossary/rmsnorm",
  "/docs/glossary/residual-connection",
  "/docs/glossary/rope",
  "/docs/glossary/alibi",
  "/docs/glossary/context-window",
] as const;

/** Batch 017 architecture-related concept pages reconciled in Phase 2/3. */
const BATCH_017_ARCHITECTURE_URLS = [
  "/docs/concepts/transformer-architecture",
  "/docs/concepts/positional-encodings",
  "/docs/concepts/context-extension",
  "/docs/concepts/why-long-context-is-hard",
  "/docs/glossary/transformer",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/world-model",
  "/docs/glossary/feed-forward-network",
  "/docs/glossary/batch-norm",
  "/docs/glossary/group-norm",
  "/docs/glossary/standard-ffn",
  "/docs/glossary/mixture-of-experts",
  "/docs/glossary/relu",
  "/docs/glossary/leaky-relu",
  "/docs/glossary/silu",
  "/docs/glossary/swiglu",
  "/docs/glossary/normalization",
  "/docs/glossary/qk-norm",
  "/docs/glossary/layer-norm",
  "/docs/glossary/rmsnorm",
  "/docs/glossary/residual-connection",
  "/docs/glossary/rope",
  "/docs/glossary/alibi",
  "/docs/glossary/context-window",
] as const;

describe("Phase 2/3 reconciliation browse indexes (US-004)", () => {
  test("glossary index lists every batch 017 glossary page sorted by localized title", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    const entryByUrl = new Map(entries.map((entry) => [entry.url, entry]));

    for (const url of BATCH_017_GLOSSARY_URLS) {
      const entry = entryByUrl.get(url);
      expect(entry).toBeDefined();
      expect(entry?.title.length).toBeGreaterThan(0);
      expect(entry?.summary.length).toBeGreaterThan(0);
    }

    for (let index = 1; index < entries.length; index += 1) {
      expect(
        entries[index - 1].title.localeCompare(entries[index].title, "en", {
          sensitivity: "base",
        }),
      ).toBeLessThanOrEqual(0);
    }
  });

  test("architecture index lists batch 017 foundations and concept pages sorted by title", async () => {
    const entries = await loadPublishedArchitectureEntries("en");
    const entryByUrl = new Map(entries.map((entry) => [entry.url, entry]));

    for (const url of BATCH_017_ARCHITECTURE_URLS) {
      const entry = entryByUrl.get(url);
      expect(entry).toBeDefined();
      expect(entry?.title.length).toBeGreaterThan(0);
      expect(entry?.summary.length).toBeGreaterThan(0);
    }

    for (let index = 1; index < entries.length; index += 1) {
      expect(
        entries[index - 1].title.localeCompare(entries[index].title, "en", {
          sensitivity: "base",
        }),
      ).toBeLessThanOrEqual(0);
    }
  });

  test("glossary and architecture index pages render bulletless title-plus-summary lists", async () => {
    const glossaryHtml = renderToStaticMarkup(await GlossaryIndexPage());
    const architectureHtml = renderToStaticMarkup(
      await ArchitectureIndexPage(),
    );

    for (const url of [
      "/docs/glossary/transformer",
      "/docs/glossary/rope",
      "/docs/glossary/context-window",
    ]) {
      expect(glossaryHtml).toContain(`href="${url}"`);
    }

    for (const url of [
      "/docs/concepts/transformer-architecture",
      "/docs/concepts/positional-encodings",
      "/docs/glossary/feed-forward-network",
      "/docs/glossary/world-model",
    ]) {
      expect(architectureHtml).toContain(`href="${url}"`);
    }

    expect(glossaryHtml).toContain("list-none");
    expect(glossaryHtml).not.toContain("list-disc");
    expect(architectureHtml).toContain("list-none");
    expect(architectureHtml).not.toContain("list-disc");
  });
});

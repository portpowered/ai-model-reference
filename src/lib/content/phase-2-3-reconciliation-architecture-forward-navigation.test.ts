import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";

/** Model-family forward targets from architecture glossary curated related links. */
const MODEL_FAMILY_REGISTRY_IDS = [
  "concept.transformer",
  "concept.diffusion-model",
  "concept.multimodal-model",
  "concept.world-model",
] as const;

const MODEL_FAMILY_GLOSSARY_URLS = [
  "/docs/glossary/transformer",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/world-model",
] as const;

const PLANNED_ROW_META_SNIPPETS = [
  "not links yet",
  "later phase",
  "planned reference",
  "Upcoming model family",
] as const;

describe("Phase 2/3 reconciliation architecture-forward navigation (US-008)", () => {
  test("all four model-family registry records are published with docs pages", async () => {
    const indexes = await loadRegistry();
    const architecture = indexes.byId.get("concept.architecture");
    expect(architecture?.kind).toBe("concept");

    for (const id of MODEL_FAMILY_REGISTRY_IDS) {
      const record = indexes.byId.get(id);
      expect(record?.status).toBe("published");
      expect(architecture?.relatedIds).toContain(id);
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(id)).toBe(true);
    }
  });

  test("architecture curated related lists live glossary hrefs for all four model families", () => {
    const source = getRegistryRecordById("concept.architecture");
    if (!source) {
      throw new Error("expected concept.architecture in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const [index, id] of MODEL_FAMILY_REGISTRY_IDS.entries()) {
      const item = items.find((entry) => entry.registryId === id);
      expect(item?.isPlanned).toBe(false);
      expect(item?.href).toBe(MODEL_FAMILY_GLOSSARY_URLS[index]);
    }
  });

  test("architecture browse index lists all four model-family glossary pages", async () => {
    const entries = await loadPublishedArchitectureEntries("en");
    const entryByUrl = new Map(entries.map((entry) => [entry.url, entry]));

    for (const url of MODEL_FAMILY_GLOSSARY_URLS) {
      const entry = entryByUrl.get(url);
      expect(entry).toBeDefined();
      expect(entry?.title.length).toBeGreaterThan(0);
      expect(entry?.summary.length).toBeGreaterThan(0);
    }
  });

  test("architecture messages omit planned model-family callout keys", () => {
    const messagesPath = join(
      GLOSSARY_DOCS_ROOT,
      "architecture",
      "messages/en.json",
    );
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.callouts?.upcomingModelFamilies).toBeUndefined();
  });

  test("architecture glossary page renders live model-family links without planned rows", async () => {
    const page = await loadGlossaryPage("architecture");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    for (const snippet of PLANNED_ROW_META_SNIPPETS) {
      expect(html).not.toContain(snippet);
    }

    for (const url of MODEL_FAMILY_GLOSSARY_URLS) {
      expect(html).toContain(`href="${url}"`);
    }

    expect(html).not.toContain('data-planned="true"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });

  test("architecture index page renders model-family entries with working hrefs", async () => {
    const html = renderToStaticMarkup(await ArchitectureIndexPage());

    for (const url of MODEL_FAMILY_GLOSSARY_URLS) {
      expect(html).toContain(`href="${url}"`);
    }
  });
});

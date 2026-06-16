import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";

const PLANNED_ROW_META_SNIPPETS = [
  "not links yet",
  "later phase",
  "planned reference",
  "Upcoming model family",
] as const;

describe("Phase 2 architecture forward navigation (US-006)", () => {
  test("architecture messages omit planned model family callout keys", () => {
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

  test("architecture curated related lists live links for all four model families", () => {
    const source = getRegistryRecordById("concept.architecture");
    if (!source) {
      throw new Error("expected concept.architecture in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const familyIds = [
      "concept.transformer",
      "concept.diffusion-model",
      "concept.multimodal-model",
      "concept.world-model",
    ] as const;

    for (const id of familyIds) {
      const item = items.find((entry) => entry.registryId === id);
      expect(item?.isPlanned).toBe(false);
      expect(item?.href).toBe(`/docs/glossary/${id.replace("concept.", "")}`);
    }

    const publishedPeers = items.filter((item) => item.href);
    expect(publishedPeers.map((item) => item.slug).sort()).toEqual([
      "diffusion-model",
      "model",
      "module",
      "multimodal-model",
      "transformer",
      "world-model",
    ]);
  });

  test("architecture page renders all four family links without planned-row meta copy", async () => {
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

    expect(html).toContain("Transformers");
    expect(html).toContain("diffusion models");
    expect(html).toContain("multimodal models");
    expect(html).toContain("world models");

    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/glossary/world-model"');

    expect(html).toContain('href="/docs/glossary/model"');
    expect(html).toContain('href="/docs/glossary/module"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });
});

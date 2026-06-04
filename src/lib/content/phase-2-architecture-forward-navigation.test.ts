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
import {
  deriveCuratedRelatedItems,
  PLANNED_RELATED_REASON_LABEL,
} from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";

const DRAFT_FORWARD_TARGET_IDS = [
  "concept.transformer",
  "concept.diffusion-model",
  "concept.multimodal-model",
  "concept.world-model",
] as const;

const DRAFT_FORWARD_DISPLAY_TITLES = [
  "Transformers",
  "diffusion models",
  "multimodal models",
  "world models",
] as const;

const DRAFT_FORWARD_SLUGS = [
  "transformer",
  "diffusion-model",
  "multimodal-model",
  "world-model",
] as const;

const UPCOMING_FAMILIES_CALLOUT_SNIPPET =
  "planned reference pages. They are not links yet";

describe("Phase 2 architecture forward navigation (US-006)", () => {
  test("architecture messages explain upcoming model family pages", () => {
    const messagesPath = join(
      GLOSSARY_DOCS_ROOT,
      "architecture",
      "messages/en.json",
    );
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.callouts?.upcomingModelFamilies?.title).toContain(
      "Upcoming",
    );
    expect(messages.callouts?.upcomingModelFamilies?.body).toContain(
      UPCOMING_FAMILIES_CALLOUT_SNIPPET,
    );
  });

  test("architecture curated related lists four planned forward targets", () => {
    const source = getRegistryRecordById("concept.architecture");
    if (!source) {
      throw new Error("expected concept.architecture in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const plannedForward = items.filter((item) =>
      DRAFT_FORWARD_TARGET_IDS.includes(
        item.registryId as (typeof DRAFT_FORWARD_TARGET_IDS)[number],
      ),
    );
    expect(plannedForward).toHaveLength(4);
    for (const item of plannedForward) {
      expect(item.isPlanned).toBe(true);
      expect(item.href).toBeUndefined();
      expect(item.reasonLabel).toBe(PLANNED_RELATED_REASON_LABEL);
    }

    const publishedPeers = items.filter((item) => item.href);
    expect(publishedPeers.map((item) => item.slug).sort()).toEqual([
      "model",
      "module",
    ]);
  });

  test("architecture page renders planned family rows, localized callout, and safe links", async () => {
    const page = await loadGlossaryPage("architecture");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Upcoming model family pages");
    expect(html).toContain(UPCOMING_FAMILIES_CALLOUT_SNIPPET);

    for (const title of DRAFT_FORWARD_DISPLAY_TITLES) {
      expect(html).toContain(title);
    }

    const plannedCount = (html.match(/data-planned="true"/g) ?? []).length;
    expect(plannedCount).toBeGreaterThanOrEqual(4);

    for (const slug of DRAFT_FORWARD_SLUGS) {
      expect(html).not.toContain(`href="/docs/glossary/${slug}"`);
    }

    expect(html).toContain('href="/docs/glossary/model"');
    expect(html).toContain('href="/docs/glossary/module"');
    expect(html).toContain(PLANNED_RELATED_REASON_LABEL);
    expect(html).toContain('data-testid="curated-related-docs"');
  });
});

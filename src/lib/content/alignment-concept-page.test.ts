import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { getConceptById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = getDocsPageDir("concepts", "alignment");
const messagesPath = join(pageDir, "messages/en.json");

describe("alignment concept page (alignment-concept-page-001)", () => {
  test("registry record and published docs entry resolve the concepts route", () => {
    const record = getConceptById("concept.alignment");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.alignment")).toBe(true);

    const entry = getPublishedDocsEntryByRegistryId("concept.alignment");
    expect(entry?.pageKind).toBe("concept");
    expect(entry?.section).toBe("concepts");
    expect(entry?.docsSlug).toBe("concepts/alignment");
  });

  test("page renders isolation-first alignment summary and standard concept sections", async () => {
    const page = await loadConceptPage("alignment");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.alignment");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("pretrained");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("preference");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("helpful");
    expect(html).toContain("pretraining");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});

describe("alignment concept page (alignment-concept-page-002)", () => {
  test("messages distinguish pretraining, alignment methods, and benchmark misuse", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const nearby = messages.sections?.comparedToNearbyRegimes.body ?? "";
    expect(nearby.toLowerCase()).toContain("pretraining");
    expect(nearby.toLowerCase()).toContain("large-scale");
    expect(nearby.toLowerCase()).toContain("human preferences");
    expect(nearby.toLowerCase()).toContain("helpfulness");
    expect(nearby.toLowerCase()).toContain("safety");
    expect(nearby.toLowerCase()).toContain("direct preference optimization");
    expect(nearby.toLowerCase()).toContain(
      "reinforcement learning from human feedback",
    );
    expect(nearby.toLowerCase()).toContain("proximal policy optimization");
    expect(nearby.toLowerCase()).toContain(
      "group relative policy optimization",
    );
    expect(nearby.toLowerCase()).toContain("benchmark leaderboard");

    const confusions = messages.sections?.commonConfusions.body ?? "";
    expect(confusions.toLowerCase()).toContain("benchmark");
    expect(confusions.toLowerCase()).toContain("leaderboard");
  });

  test("page renders nearby-regime links to pretraining, DPO, and safe search paths", async () => {
    const page = await loadConceptPage("alignment");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Compared To Nearby Regimes");
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).toContain('href="/search?q=RLHF"');
    expect(html).toContain('href="/search?q=PPO"');
    expect(html).toContain('href="/search?q=GRPO"');
    expect(html).toContain("not a benchmark leaderboard");
  });
});

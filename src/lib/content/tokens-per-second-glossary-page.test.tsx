import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossarySingleTagPillList,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  getPublishedDocsRegistryIds,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  applyRelatedDocMessageOverrides,
  deriveCuratedRelatedItems,
} from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const pageDir = getDocsPageDir("glossary", "tokens-per-second");
const messagesPath = join(pageDir, "messages/en.json");

describe("tokens per second glossary page (tokens-per-second-glossary-page-002)", () => {
  test("messages expand Tokens Per Second before shorthand and teach throughput basics", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Tokens Per Second");
    expect(messages.openingSummary).toMatch(/^Tokens per second \(tokens\/s/);
    expect(messages.description).toContain("throughput rate");
    expect(messages.description).toContain("measurement window");
    expect(messages.sections?.whatItIs.body).toMatch(
      /^Tokens per second \(tokens\/s/,
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("token");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "tokenizer",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "different token counts",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "batching",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "60 tokens per second",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "time to first token",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "inter-token latency",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).not.toMatch(
      /leaderboard|benchmark suite|artificial analysis/i,
    );
  });

  test("page renders throughput explainer prose without reader-shortcut copy", async () => {
    const page = await loadGlossaryPage("tokens-per-second");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.tokens-per-second");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expectGlossaryOmitsOpeningSummary(html);
    expectGlossarySingleTagPillList(html);
    expectHtmlToContainProse(html, "Tokens per second");
    expectHtmlToContainProse(html, "tokenizer");
    expectHtmlToContainProse(html, "time to first token");
    expectHtmlToContainProse(html, "inter-token latency");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});

describe("tokens per second glossary page (tokens-per-second-glossary-page-003)", () => {
  test("messages distinguish throughput from latency metrics and explain serving mechanics", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const comparison = messages.sections?.metricComparison.body ?? "";
    expect(comparison.toLowerCase()).toContain("total request latency");
    expect(comparison.toLowerCase()).toContain("time to first token");
    expect(comparison.toLowerCase()).toContain("inter-token latency");
    expect(comparison.toLowerCase()).toContain("streamed output token");
    expect(comparison.toLowerCase()).toContain("aggregate output rate");

    const mechanics = messages.sections?.whatAffectsThroughput.body ?? "";
    expect(mechanics.toLowerCase()).toContain("batch size");
    expect(mechanics.toLowerCase()).toContain("prefill");
    expect(mechanics.toLowerCase()).toContain("decode");
    expect(mechanics.toLowerCase()).toContain("kv cache");
    expect(mechanics.toLowerCase()).toContain("memory bandwidth");
    expect(mechanics.toLowerCase()).toContain("active model size");
    expect(mechanics.toLowerCase()).toContain("queue wait");
  });

  test("page renders metric boundaries and throughput mechanics without reader-shortcut copy", async () => {
    const page = await loadGlossaryPage("tokens-per-second");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectHtmlToContainProse(html, "total request latency");
    expectHtmlToContainProse(html, "time to first token");
    expectHtmlToContainProse(html, "inter-token latency");
    expectHtmlToContainProse(html, "larger batch");
    expectHtmlToContainProse(html, "prefill");
    expectHtmlToContainProse(html, "memory bandwidth");
    expectHtmlToContainProse(html, "model size shifts");
    expect(html).toContain('id="metric-comparison"');
    expect(html).toContain('id="what-affects-throughput"');
    expect(html).not.toContain("Reader Shortcut");
  });
});

const TOKENS_PER_SECOND_RELATED_EXPLANATIONS = {
  "concept.time-to-first-token":
    "Time to first token measures wait before streaming starts, so compare it with throughput when a deployment looks fast on paper but slow to begin answering.",
  "concept.inter-token-latency":
    "Inter-token latency tracks per-token streaming rhythm, which can feel uneven even when aggregate tokens per second looks healthy.",
  "concept.prefill":
    "Prefill dominates prompt work, so a prefill-heavy request mix can lower reported generation throughput even when decode itself is efficient.",
  "concept.decode":
    "Decode is where generated tokens are produced repeatedly, so decode cost and cache traffic set the baseline for sustained tok/s.",
  "concept.kv-cache":
    "KV cache growth raises memory movement each decode step, which often caps throughput before raw compute does.",
  "concept.prefill-decode-split":
    "Split deployments move cache state between workers, which can change how much generation work each pool sustains per second.",
  "system.batching":
    "Batching decides how many requests share each accelerator step, which is one of the main levers for raising aggregate throughput.",
  "system.continuous-batching":
    "Continuous batching keeps decode slots filled as sequences finish, which can lift tok/s under steady streaming load.",
  "system.request-scheduling":
    "Request scheduling decides which work runs next under contention, so queueing and fairness policies shape realized throughput.",
  "system.memory":
    "Memory bandwidth and residency limits how quickly weights and KV cache state can move during decode-heavy bursts.",
  "system.inference-engine":
    "The inference engine implements batching, scheduling, and the decode loop that turn hardware capacity into reported tokens per second.",
} as const;

describe("tokens per second glossary page (tokens-per-second-glossary-page-004)", () => {
  test("messages define throughput-focused related explanations for every registry related id", async () => {
    const page = await loadGlossaryPage("tokens-per-second");
    const record = getConceptById("concept.tokens-per-second");

    for (const registryId of record?.relatedIds ?? []) {
      expect(page.messages.relatedDocs?.[registryId]?.reason).toBe(
        TOKENS_PER_SECOND_RELATED_EXPLANATIONS[
          registryId as keyof typeof TOKENS_PER_SECOND_RELATED_EXPLANATIONS
        ],
      );
    }
  });

  test("curated related docs surface throughput explanations without unpublished targets", async () => {
    const source = getConceptById("concept.tokens-per-second");
    if (!source) {
      throw new Error("expected concept.tokens-per-second in registry");
    }

    const page = await loadGlossaryPage("tokens-per-second");
    const items = applyRelatedDocMessageOverrides(
      deriveCuratedRelatedItems(
        source,
        listRelatedRegistryRecords(),
        getPublishedDocsRegistryIds(),
      ),
      page.messages,
    );

    expect(items.map((item) => item.registryId)).toEqual(source.relatedIds);
    expect(
      items.some(
        (item) =>
          item.registryId === "system.inference-engine" &&
          item.href === "/docs/systems/inference-engine",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "system.batching" &&
          item.href === "/docs/systems/batching",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "system.request-scheduling" &&
          item.href === "/docs/systems/request-scheduling",
      ),
    ).toBe(true);
    expect(items.every((item) => Boolean(item.reasonLabel?.length))).toBe(true);
  });

  test("search discovery finds tokens per second through throughput aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/tokens-per-second",
    );

    for (const alias of [
      "tokens per second",
      "tokens/s",
      "tok/s",
      "TPS",
      "throughput",
      "generation throughput",
    ] as const) {
      expect(document?.aliases).toContain(alias);
    }
  });

  test("page renders serving-path links to inference engine, batching, and request scheduling", async () => {
    const page = await loadGlossaryPage("tokens-per-second");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectHtmlToContainProse(html, "execution policy");
    expectHtmlToContainProse(html, "batching tradeoffs");
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/continuous-batching"');
    expect(html).toContain('href="/docs/systems/request-scheduling"');
    expect(html).toContain('href="/docs/glossary/inter-token-latency"');
    expect(html).toContain('href="/docs/glossary/time-to-first-token"');
    expect(html).toContain('id="serving-path"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("roofline");
    expect(html).not.toContain("Reader Shortcut");
  });
});

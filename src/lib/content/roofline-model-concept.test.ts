import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { validateColocatedPageBundle } from "@/lib/content/validate-registry";

const pageDir = getDocsPageDir("concepts", "roofline-model");
const messagesPath = join(pageDir, "messages/en.json");
const REGISTRY_ID = "concept.roofline-model";

const ROOFLINE_ALIASES = [
  "roofline model",
  "roofline",
  "memory bound",
  "compute bound",
  "memory-bandwidth bound",
  "arithmetic intensity",
] as const;

describe("roofline model concept discovery (roofline-model-concept-page-001)", () => {
  test("registry record is published with throughput-ceiling aliases, tags, and related ids", () => {
    const record = getConceptById(REGISTRY_ID);

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("roofline-model");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.aliases).toEqual([...ROOFLINE_ALIASES]);
    expect(record?.tags).toEqual(["foundations", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "system.memory",
      "system.inference-engine",
      "concept.quantization",
      "concept.inter-token-latency",
      "concept.hidden-size",
    ]);
    expect(record?.citationIds).toEqual(["citation.orca-serving-system"]);
  });

  test("discovery metadata frames roofline as a general throughput ceiling, not a benchmark", () => {
    const record = getConceptById(REGISTRY_ID);
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(record?.defaultSummaryKey).toBe("description");
    expect(messages.description.toLowerCase()).toContain("throughput");
    expect(messages.description.toLowerCase()).toContain(
      "arithmetic intensity",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "not a benchmark leaderboard",
    );
    expect(
      messages.sections?.commonConfusions.body?.toLowerCase(),
    ).not.toContain("vendor comparison");
  });

  test("concept page frontmatter and messages align with the registry contract", async () => {
    const page = await loadConceptPage("roofline-model");
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.tags).toEqual(["foundations", "kv-cache"]);
    expect(page.frontmatter.aliases).toEqual([...ROOFLINE_ALIASES]);
    expect(page.frontmatter.updatedAt).toBe("2026-07-02");
    expect(messages.title).toBe("Roofline model");
    expect(messages.description).toContain("throughput-ceiling");
  });

  test("colocated bundle validates against the registry record", async () => {
    const { errors } = await validateColocatedPageBundle(pageDir);
    expect(errors).toEqual([]);
  });

  test("curated related links resolve to published throughput-adjacent pages", () => {
    const source = getConceptById(REGISTRY_ID);
    if (!source) {
      throw new Error(`expected ${REGISTRY_ID} in registry`);
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "system.memory")?.href,
    ).toBe("/docs/systems/memory");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
    expect(
      items.find((item) => item.registryId === "concept.quantization")?.href,
    ).toBe("/docs/concepts/quantization");
    expect(
      items.find((item) => item.registryId === "concept.inter-token-latency")
        ?.href,
    ).toBe("/docs/glossary/inter-token-latency");
    expect(
      items.find((item) => item.registryId === "concept.hidden-size")?.href,
    ).toBe("/docs/glossary/hidden-size");
  });
});

describe("roofline model concept page (roofline-model-concept-page-002)", () => {
  test("messages teach throughput bounds, arithmetic intensity, and layperson consequences", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.openingSummary?.toLowerCase()).toContain(
      "best practical throughput",
    );
    expect(messages.openingSummary?.toLowerCase()).toContain("memory movement");
    expect(
      messages.sections?.memoryBandwidthBound.body?.toLowerCase(),
    ).toContain("weights");
    expect(
      messages.sections?.memoryBandwidthBound.body?.toLowerCase(),
    ).toContain("activations");
    expect(
      messages.sections?.memoryBandwidthBound.body?.toLowerCase(),
    ).toContain("kv-cache");
    expect(messages.sections?.computeBound.body?.toLowerCase()).toContain(
      "arithmetic units",
    );
    expect(messages.sections?.computeBound.body?.toLowerCase()).toContain(
      "fully occupied",
    );
    expect(
      messages.sections?.arithmeticIntensity.body?.toLowerCase(),
    ).toContain("operations per byte");
    expect(
      messages.sections?.arithmeticIntensity.body?.toLowerCase(),
    ).toContain("compute-bound");
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "not a benchmark leaderboard",
    );
    expect(
      messages.sections?.commonConfusions.body?.toLowerCase(),
    ).not.toContain("vendor comparison");
  });

  test("page renders teaching sections, opening summary, and related links", async () => {
    const page = await loadConceptPage("roofline-model");

    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Memory-Bandwidth Bound");
    expect(html).toContain("Compute Bound");
    expect(html).toContain("Arithmetic Intensity");
    expect(html).toContain("memory-bandwidth bound");
    expect(html).toContain("compute-bound");
    expect(html).toContain("operations per byte");
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});

describe("roofline model teaching visual (roofline-model-concept-page-003)", () => {
  test("assets and messages define the primary roofline teaching chart", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.assets?.rooflineChart?.title).toContain("Roofline");
    expect(messages.assets?.rooflineChart?.alt?.toLowerCase()).toContain(
      "memory-bandwidth-bound",
    );
    expect(messages.assets?.rooflineChart?.alt?.toLowerCase()).toContain(
      "compute-bound",
    );
    expect(messages.assets?.rooflineChart?.caption?.toLowerCase()).toContain(
      "not hardware rankings",
    );
    expect(
      messages.assets?.rooflineChart?.legend?.axisX?.label?.toLowerCase(),
    ).toContain("arithmetic intensity");
    expect(
      messages.assets?.rooflineChart?.legend?.axisY?.label?.toLowerCase(),
    ).toContain("throughput");
  });

  test("page renders the roofline teaching chart with legend and accessible markers", async () => {
    const page = await loadConceptPage("roofline-model");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-page-asset="rooflineChart"');
    expect(html).toContain('data-chart-id="chart.roofline-model.teaching"');
    expect(html).toContain("Illustrative Roofline Ceiling");
    expect(html).toContain("Memory-bandwidth bound");
    expect(html).toContain("Compute bound");
    expect(html).toContain("Arithmetic intensity (ops per byte)");
    expect(html).toContain("Attainable throughput (GFLOP/s)");
    expect(html).toContain("teaches bounds, not hardware rankings");
  });
});

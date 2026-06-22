import { describe, expect, test } from "bun:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { T } from "@/features/docs/components/T";
import { SystemFlowGraph } from "@/features/models/components/SystemFlowGraph";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { loadSystemPageFromDisk } from "@/lib/content/system-page-load";

async function renderInferenceEngineRuntimeHtml(): Promise<string> {
  const page = await loadSystemPageFromDisk("inference-engine");

  return renderToStaticMarkup(
    createElement(
      ModulePageProviders,
      {
        messages: page.messages,
        assets: page.assets,
      },
      createElement(Fragment, null, [
        createElement(T, {
          key: "how-it-works",
          k: "sections.howItWorks.body",
        }),
        createElement(T, {
          key: "practical-impact",
          k: "sections.practicalImpact.body",
        }),
        createElement(T, {
          key: "related",
          k: "sections.related.body",
        }),
      ]),
    ),
  );
}

describe("inference engine system page", () => {
  test("is published on the canonical systems route", () => {
    const page = loadPublishedDocsPagesSync("en").find(
      (entry) => entry.frontmatter.registryId === "system.inference-engine",
    );

    expect(page?.docsSlug).toBe("systems/inference-engine");
    expect(page?.url).toBe("/docs/systems/inference-engine");
  });

  test("loads the canonical system page with graph asset wiring", async () => {
    const page = await loadSystemPageFromDisk("inference-engine");

    expect(page.messages.title).toBe("Inference Engine");
    expect(page.frontmatter.registryId).toBe("system.inference-engine");
    expect(page.assets.systemFlow).toMatchObject({
      graphId: "graph.inference-engine-system-flow",
      webRenderer: "react-flow",
    });
    expect(page.messages.openingSummary).toContain("runtime software");
    expect(page.messages.sections?.howItWorks?.body).toContain("Kernels");
    expect(getGraphById("graph.inference-engine-system-flow")?.subjectId).toBe(
      "system.inference-engine",
    );
  });

  test("loads through the shared local docs path with the expected section structure", async () => {
    const page = await loadLocalDocsPage({
      section: "systems",
      slug: "inference-engine",
    });

    expect(page.frontmatter.kind).toBe("system");
    expect(page.frontmatter.registryId).toBe("system.inference-engine");
    expect(page.assets.systemFlow).toMatchObject({
      graphId: "graph.inference-engine-system-flow",
    });
    expect(page.toc.map((item) => item.url)).toContain("#how-it-works");
    expect(page.messages.assets?.systemFlow?.alt).toContain("Requests enter");
  });

  test("renders runtime responsibilities and serving-topic handoffs in the visible runtime content", async () => {
    const html = await renderInferenceEngineRuntimeHtml();

    expect(html).toContain("dispatches kernels");
    expect(html).toContain("batches or interleaves work");
    expect(html).toContain("cache state");
    expect(html).toContain("latency");
    expect(html).toContain("throughput");
    expect(html).toContain("batching");
    expect(html).toContain("routing");
    expect(html).toContain("deployment");
  });

  test("renders the system flow graph with a dedicated title and legend", async () => {
    const page = await loadSystemPageFromDisk("inference-engine");
    const html = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        createElement(SystemFlowGraph, {
          registryId: "system.inference-engine",
          assetId: "systemFlow",
        }),
      ),
    );

    expect(html).toContain(
      'data-graph-title="graph.inference-engine-system-flow"',
    );
    expect(html).toContain("Inference Engine System Flow");
    expect(html).toContain(
      'data-graph-legend="graph.inference-engine-system-flow"',
    );
    expect(html).toContain("Request and weight flow");
    expect(html).toContain("Cache writes and reuse");
  });

  test("renders curated nearby serving links for cache, quantization, systems, and models", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="system.inference-engine" />,
    );

    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/on-disk-kv-cache"');
    expect(html).toContain('href="/docs/systems/expert-parallel-overlap"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain("curated");
  });
});

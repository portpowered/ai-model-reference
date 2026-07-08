import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getSystemById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  loadAppTestContext,
  renderWithAppProviders,
} from "@/tests/a11y/render";
import { loadSystemPage } from "./system-page";

afterEach(() => {
  cleanup();
});

describe("Deployment system page (deployment-system-page-001)", () => {
  test("registry record publishes deployment as a serving system with canonical discovery metadata", () => {
    const record = getSystemById("system.deployment");

    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("deployment");
    expect(record?.kind).toBe("system");
    expect(record?.systemType).toBe("serving");
    expect(record?.aliases).toEqual([
      "model deployment",
      "LLM deployment",
      "serving deployment",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.quantization",
      "concept.prefill-decode-split",
      "concept.kv-cache",
      "concept.kv-cache-quantization",
      "system.routing",
      "system.inference-engine",
      "system.batching",
      "system.on-disk-kv-cache",
      "system.expert-parallel-overlap",
      "model.gpt-3",
      "model.deepseek-v4-pro",
      "model.nemotron-3-super",
      "model.gemma",
    ]);
    expect(record?.relatedConceptIds).toEqual([
      "concept.quantization",
      "concept.kv-cache",
      "concept.prefill-decode-split",
      "concept.context-window",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("system.deployment")).toBe(true);
  });

  test("curated related links resolve to nearby published serving and model surfaces", () => {
    const source = getSystemById("system.deployment");
    if (!source) {
      throw new Error("expected system.deployment in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "system.routing")?.href,
    ).toBe("/docs/systems/routing");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
    expect(
      items.find((item) => item.registryId === "system.batching")?.href,
    ).toBe("/docs/systems/batching");
    expect(
      items.find((item) => item.registryId === "concept.quantization")?.href,
    ).toBe("/docs/concepts/quantization");
    expect(
      items.find((item) => item.registryId === "system.expert-parallel-overlap")
        ?.href,
    ).toBe("/docs/systems/expert-parallel-overlap");
    expect(
      items.find((item) => item.registryId === "concept.prefill-decode-split")
        ?.href,
    ).toBe("/docs/concepts/prefill-decode-split");
    expect(
      items.find((item) => item.registryId === "system.on-disk-kv-cache")?.href,
    ).toBe("/docs/systems/on-disk-kv-cache");
    expect(items.find((item) => item.registryId === "model.gpt-3")?.href).toBe(
      "/docs/models/gpt-3",
    );
    expect(
      items.find((item) => item.registryId === "model.deepseek-v4-pro")?.href,
    ).toBe("/docs/models/deepseek-v4-pro");
  });

  test("page bundle carries deployment framing and the system flow graph contract", async () => {
    const page = await loadSystemPage("deployment");

    expect(page.frontmatter.kind).toBe("system");
    expect(page.frontmatter.registryId).toBe("system.deployment");
    expect(page.frontmatter.tags).toEqual([
      "foundations",
      "quantization",
      "kv-cache",
    ]);
    expect(page.messages.openingSummary).toContain("becomes a service");
    expect(page.messages.openingSummary).toContain("traffic policy");
    expect(page.messages.sections?.whereItSits.body).toContain(
      "target hardware",
    );
    expect(page.messages.sections?.whereItSits.body).toContain(
      "Deployment does neither",
    );
    expect(page.messages.sections?.howItWorks.body).toContain(
      "Hardware shape matters",
    );
    expect(page.messages.sections?.practicalImpact.body).toContain("rollback");
    expect(page.messages.sections?.practicalImpact.body).toContain("KV cache");
    expect(page.messages.sections?.practicalImpact.body).toContain(
      "actually operable",
    );
    const systemFlowAsset = page.assets.systemFlow;
    expect(systemFlowAsset?.type).toBe("graph");
    if (systemFlowAsset?.type !== "graph") {
      throw new Error("expected deployment systemFlow asset to be a graph");
    }
    expect(systemFlowAsset.graphId).toBe("graph.deployment-system-flow");

    const graph = getGraphById("graph.deployment-system-flow");
    expect(graph?.subjectId).toBe("system.deployment");
    expect(graph?.nodes.map((node) => node.id)).toEqual([
      "package",
      "fit",
      "rollout",
      "rollback",
    ]);
  });

  test("docs route renders one folded opening summary for deployment", async () => {
    const { renderDocsSlugPage } = await import(
      "@/app/docs/docs-slug-renderer"
    );
    const context = await loadAppTestContext();
    const page = await renderDocsSlugPage(["systems", "deployment"]);
    const rendered = await renderWithAppProviders(
      CanonicalDocsLayout({ messages: context.messages, children: page }),
      {
        context,
        SearchDialog: () => null,
      },
    );
    const { container } = rendered;

    expect(
      container.querySelectorAll('[data-testid="folded-opening-summary"]'),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll('[data-opening-summary="folded"]'),
    ).toHaveLength(0);
    expect(
      screen.getByText(context.messages.shell.openingSummary),
    ).toBeTruthy();
    expect(container.textContent).toContain(
      "The job is not just to copy weights onto a machine.",
    );
  });

  test("related docs render deployment-facing canonical neighbors", () => {
    const html = renderToStaticMarkup(
      createElement(RelatedDocs, { registryId: "system.deployment" }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/systems/routing"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('href="/docs/concepts/prefill-decode-split"');
    expect(html).toContain('href="/docs/systems/expert-parallel-overlap"');
    expect(html).toContain('href="/docs/systems/on-disk-kv-cache"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('href="/docs/models/deepseek-v4-pro"');
  });

  test("search indexes deployment for representative deployment queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/systems/deployment",
    );
    expect(document?.kind).toBe("system");
    expect(document?.registryId).toBe("system.deployment");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "model deployment",
        "LLM deployment",
        "serving deployment",
      ]),
    );
    expect(document?.bodyText).toContain("target hardware");
    expect(document?.bodyText).toContain("rollback");

    for (const query of [
      "deployment",
      "model deployment",
      "LLM deployment",
      "serving deployment",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some((result) => result.url === "/docs/systems/deployment"),
      ).toBe(true);
    }
  });
});

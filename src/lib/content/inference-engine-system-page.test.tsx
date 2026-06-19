import { describe, expect, test } from "bun:test";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { loadSystemPageFromDisk } from "@/lib/content/system-page-load";

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
});

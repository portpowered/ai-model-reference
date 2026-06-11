import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPageFromDisk } from "./concept-page-load";
import {
  getConceptsDocsRoot,
  getContentRoot,
  getRegistryRoot,
} from "./content-paths";
import { loadRegistry } from "./registry";
import { validateGeneratedPageBundle } from "./validate-generated-page-bundle";

const SAMPLE_SLUG = "page-spec-workflow-sample";

describe("page-spec workflow sample", () => {
  test("committed sample bundle loads, validates, and renders message-driven content", async () => {
    const conceptsDocsRoot = getConceptsDocsRoot();
    const pageDir = join(conceptsDocsRoot, SAMPLE_SLUG);
    const registryPath = join(
      getRegistryRoot(),
      "concepts",
      `${SAMPLE_SLUG}.json`,
    );
    const indexes = await loadRegistry({ registryRoot: getRegistryRoot() });

    const errors = await validateGeneratedPageBundle({
      registryRoot: getRegistryRoot(),
      docsRoot: join(getContentRoot(), "docs"),
      pageDirectory: pageDir,
      registryPath,
      pageUrl: `/docs/concepts/${SAMPLE_SLUG}`,
      indexes,
    });
    expect(errors).toEqual([]);

    const loaded = await loadConceptPageFromDisk(
      SAMPLE_SLUG,
      "en",
      conceptsDocsRoot,
    );
    expect(loaded.messages.title).toBe("Page Spec Workflow Sample");
    expect(loaded.messages.openingSummary).toContain("page-spec file");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: loaded.messages,
        assets: loaded.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: loaded.content,
      }),
    );

    expect(html).toContain("Page Spec Workflow Sample");
    expect(html).toContain("page-spec file");
    expect(html).toContain("Page spec input");
    expect(html).toContain("Generated bundle");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
  });
});

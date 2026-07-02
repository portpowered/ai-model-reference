import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { cleanup, screen } from "@testing-library/react";
import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderDocsSlugPage } from "@/app/docs/docs-slug-renderer";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { validatePageAssetReferences } from "@/lib/content/assets";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { getModelById } from "@/lib/content/registry-runtime";
import {
  RENDERED_QUALITY_PROCESS_LANGUAGE_PATTERNS,
  RENDERED_QUALITY_READER_SHORTCUT_MARKERS,
} from "@/lib/verify/rendered-quality-baseline";
import {
  captureOriginalFetch,
  installDocsSearchFetchMock,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";

setDefaultTimeout(15_000);

type GlmModelSlug = "glm-5" | "glm-5-2";

const OPENING_SUMMARY_SNIPPETS: Record<GlmModelSlug, string> = {
  "glm-5": "agentic engineering",
  "glm-5-2": "long-horizon coding",
};

const CITATION_URL_SNIPPETS: Record<GlmModelSlug, string[]> = {
  "glm-5": ["arxiv.org/abs/2602.15763"],
  "glm-5-2": [
    "arxiv.org/abs/2602.15763",
    "huggingface.co/blog/zai-org/glm-52-blog",
  ],
};

const GRAPH_IDS: Record<GlmModelSlug, string> = {
  "glm-5": "graph.glm-5-architecture",
  "glm-5-2": "graph.glm-5-2-architecture",
};

function assertNoProcessLanguage(text: string): void {
  for (const pattern of RENDERED_QUALITY_PROCESS_LANGUAGE_PATTERNS) {
    expect(text).not.toMatch(pattern);
  }
}

function assertNoReaderShortcutMarkers(html: string): void {
  for (const marker of RENDERED_QUALITY_READER_SHORTCUT_MARKERS) {
    expect(html).not.toContain(marker);
  }
  expect(html).not.toContain("Reader Shortcut");
}

async function renderModelBodyHtml(slug: GlmModelSlug): Promise<string> {
  const page = await loadModelPage(slug);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("GLM family quality gate (glm-5-and-5-2-model-pages-005)", () => {
  afterEach(() => {
    cleanup();
    restoreFetchMock();
  });

  test.each([
    ["glm-5"],
    ["glm-5-2"],
  ] as const)("%s page bundle validates assets, citations, and body render without unresolved keys", async (slug) => {
    const page = await loadModelPage(slug);
    const registryId = page.frontmatter.registryId;
    const record = getModelById(registryId ?? "");

    expect(page.frontmatter.status).toBe("published");
    expect(record?.status).toBe("published");
    expect(validatePageAssetReferences(page.assets, page.messages)).toEqual([]);
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const serializedMessages = JSON.stringify(page.messages);
    assertNoProcessLanguage(serializedMessages);

    const html = await renderModelBodyHtml(slug);
    assertNoProcessLanguage(html);
    assertNoReaderShortcutMarkers(html);
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('id="references"');
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_IDS[slug]}"`);
    expect(html).toContain('data-react-flow-graph="true"');

    for (const citationUrl of CITATION_URL_SNIPPETS[slug]) {
      expect(html).toContain(citationUrl);
    }
  });

  test.each([
    ["glm-5"],
    ["glm-5-2"],
  ] as const)("%s docs shell renders the folded opening summary text for readers", async (slug) => {
    const page = await loadModelPage(slug);
    const docsPage = await renderDocsSlugPage(["models", slug]);
    captureOriginalFetch();
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();

    await act(async () => {
      await renderWithAppProviders(
        <CanonicalDocsLayout messages={context.messages}>
          {docsPage}
        </CanonicalDocsLayout>,
        { context },
      );
    });

    const summary = screen.getByTestId("folded-summary");
    expect(
      summary.closest("section")?.getAttribute("data-opening-summary"),
    ).toBe("folded");
    expect(screen.getByLabelText("Opening summary")).toBeTruthy();
    expect(summary.textContent?.toLowerCase()).toContain(
      OPENING_SUMMARY_SNIPPETS[slug],
    );
    expect(summary.textContent).toContain(
      page.messages.openingSummary?.slice(0, 48) ?? "",
    );
  });

  test("published English docs loader includes both GLM model routes", async () => {
    const pages = await loadPublishedDocsPages("en");
    const urls = pages.map((page) => page.url);

    expect(urls).toContain("/docs/models/glm-5");
    expect(urls).toContain("/docs/models/glm-5-2");
  });

  test("GLM-5.2 description expands mixture-of-experts before MoE shorthand", async () => {
    const page = await loadModelPage("glm-5-2");
    const description = page.messages.description ?? "";

    expect(description.toLowerCase()).toContain("mixture-of-experts");
    expect(description).not.toMatch(/\bMoE\b/);
  });
});

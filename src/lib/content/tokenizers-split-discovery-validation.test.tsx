import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, screen } from "@testing-library/react";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBrowseIndexPage } from "@/app/(site)/site-renderers";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { ModuleMetadataCard } from "@/features/models/components/ModuleMetadataCard";
import { CLIP_IMAGE_TOKENIZATION_PAGE_DIR } from "@/lib/content/content-paths";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModuleById,
  getRegistryRecordById,
  listClassificationMembers,
} from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { resolveModulesSidebarGroupWithSource } from "@/lib/content/sidebar-grouping";
import {
  getTopologyNavigationLabels,
  listTopologyNavigationOptions,
} from "@/lib/content/topology-navigation";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  captureOriginalFetch,
  installDocsSearchFetchMock,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";

setDefaultTimeout(15_000);

const TOKENIZER_CLASSIFICATION_ID = "classification.module.tokenization";
const POSITIONAL_CLASSIFICATION_ID =
  "classification.module.positional-encoding";

const REPRESENTATIVE_MODULES = [
  {
    registryId: "module.bpe",
    slug: "bpe",
    url: "/docs/modules/bpe",
    family: "tokenizer",
    sidebarGroupId: "tokenizers",
    classificationLabel: "Tokenization Methods",
    searchQuery: "BPE",
  },
  {
    registryId: "module.clip-image-tokenization",
    slug: "clip-image-tokenization",
    url: "/docs/modules/clip-image-tokenization",
    family: "tokenizer",
    sidebarGroupId: "tokenizers",
    classificationLabel: "Tokenization Methods",
    searchQuery: "CLIP image tokenization",
  },
  {
    registryId: "module.rope",
    slug: "rope",
    url: "/docs/modules/rope",
    family: "positional",
    sidebarGroupId: "positional-embeddings",
    classificationLabel: "Position Encoding Methods",
    searchQuery: "RoPE",
  },
  {
    registryId: "module.nope",
    slug: "nope",
    url: "/docs/modules/nope",
    family: "positional",
    sidebarGroupId: "positional-embeddings",
    classificationLabel: "Position Encoding Methods",
    searchQuery: "NoPE",
  },
] as const;

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("tokenizer and positional split discovery validation (tokenizers-005)", () => {
  afterEach(() => {
    cleanup();
    restoreFetchMock();
  });

  test("representative modules stay in the correct tokenizer or positional family", () => {
    const tokenizerMembers = listClassificationMembers(
      TOKENIZER_CLASSIFICATION_ID,
    ).map((member) => member.record.id);
    const positionalMembers = listClassificationMembers(
      POSITIONAL_CLASSIFICATION_ID,
    ).map((member) => member.record.id);

    for (const module of REPRESENTATIVE_MODULES) {
      const record = getModuleById(module.registryId);
      expect(record?.status).toBe("published");

      if (module.family === "tokenizer") {
        expect(record?.primaryClassificationId).toBe(
          TOKENIZER_CLASSIFICATION_ID,
        );
        expect(record?.moduleType).toBe("tokenizer");
        expect(tokenizerMembers).toContain(module.registryId);
        expect(positionalMembers).not.toContain(module.registryId);
      } else {
        expect(record?.primaryClassificationId).toBe(
          POSITIONAL_CLASSIFICATION_ID,
        );
        expect(record?.moduleType).toBe("position-encoding");
        expect(positionalMembers).toContain(module.registryId);
        expect(tokenizerMembers).not.toContain(module.registryId);
      }

      expect(resolveModulesSidebarGroupWithSource(record ?? {})).toEqual({
        groupId: module.sidebarGroupId,
        source: "derived-taxonomy",
      });

      const metadataHtml = renderToStaticMarkup(
        <ModuleMetadataCard registryId={module.registryId} />,
      );
      expect(metadataHtml).toContain(module.classificationLabel);
      if (module.family === "tokenizer") {
        expect(metadataHtml).not.toContain("Position Encoding Methods");
      } else {
        expect(metadataHtml).not.toContain("Tokenization Methods");
      }
    }
  });

  test("CLIP image tokenization route, registry record, English messages, and search metadata resolve together", async () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(
        readFileSync(
          join(CLIP_IMAGE_TOKENIZATION_PAGE_DIR, "messages/en.json"),
          "utf8",
        ),
      ),
    );
    const record = getRegistryRecordById("module.clip-image-tokenization");
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, await loadRegistry());
    const clipPage = pages.find(
      (page) => page.url === "/docs/modules/clip-image-tokenization",
    );
    const clipDocument = documents.find(
      (document) => document.url === "/docs/modules/clip-image-tokenization",
    );

    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error("expected module.clip-image-tokenization in registry");
    }

    expect(record.status).toBe("published");
    expect(record.primaryClassificationId).toBe(TOKENIZER_CLASSIFICATION_ID);
    expect(record.moduleType).toBe("tokenizer");
    expect(clipPage?.frontmatter.registryId).toBe(
      "module.clip-image-tokenization",
    );
    expect(clipPage?.messages.title).toBe(messages.title);
    expect(clipDocument?.aliases).toContain("CLIP image tokenization");
    expect(clipDocument?.tags).toContain("tokenization");
    expect(clipDocument?.relatedIds).toContain("concept.tokenizers-overview");
  });

  test.each(
    REPRESENTATIVE_MODULES.map(
      (module) => [module.searchQuery, module.url] as const,
    ),
  )("search query %s surfaces the canonical page at %s", async (query, expectedUrl) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(expectedUrl);
  });

  test("related-doc classification siblings keep tokenizer and positional families separated", () => {
    const bpeRelatedHtml = renderToStaticMarkup(
      <RelatedDocs registryId="module.bpe" />,
    );
    const ropeRelatedHtml = renderToStaticMarkup(
      <RelatedDocs registryId="module.rope" />,
    );

    expect(bpeRelatedHtml).toContain(
      "Same classification: tokenization methods",
    );
    expect(bpeRelatedHtml).not.toContain("Same classification: position");
    expect(ropeRelatedHtml).toContain(
      "Same classification: position encoding methods",
    );
    expect(ropeRelatedHtml).not.toContain("Same classification: tokenization");
  });

  test("browse topology renders tokenizer and positional embedding groups as separate classifications", async () => {
    const messages = await loadUiMessages();
    const labels = getTopologyNavigationLabels(messages);
    const options = listTopologyNavigationOptions({ labels });

    const tokenizers = options.find(
      (option) => option.classificationId === TOKENIZER_CLASSIFICATION_ID,
    );
    const positional = options.find(
      (option) => option.classificationId === POSITIONAL_CLASSIFICATION_ID,
    );

    expect(tokenizers?.label).toBe("Tokenizers");
    expect(positional?.label).toBe("Positional Embeddings");
    expect(tokenizers?.label).not.toBe(positional?.label);

    const browsePage = await renderBrowseIndexPage(undefined, {
      searchParams: Promise.resolve({
        classification: "tokenization-methods",
        mode: "graph-map",
      }),
    });
    const browseHtml = renderToStaticMarkup(browsePage);

    expect(browseHtml).toContain("Tokenizers Graph Map");
    expect(browseHtml).toContain(
      'href="/browse?classification=position-encoding-methods&amp;mode=graph-map"',
    );
    expect(browseHtml).not.toContain("Nothing has shipped");
    expect(browseHtml).not.toContain("No resources");
  });

  test.each(
    REPRESENTATIVE_MODULES.map(
      (module) => [module.slug, module.url, module.registryId] as const,
    ),
  )("docs route modules/%s renders published module content without placeholders", async (slug, expectedUrl, registryId) => {
    const loadedPage = await loadModulePage(slug);
    expect(loadedPage.frontmatter.registryId).toBe(registryId);

    const page = await renderDocsSlugPage(["modules", slug]);
    captureOriginalFetch();
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();

    await act(async () => {
      await renderWithAppProviders(
        <CanonicalDocsLayout messages={context.messages}>
          {page}
        </CanonicalDocsLayout>,
        { context },
      );
    });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      loadedPage.messages.title,
    );
    const article = document.querySelector(
      `article[data-registry-id="${registryId}"]`,
    );
    expect(article).toBeTruthy();
    expect(screen.queryByText("Nothing has shipped")).toBeNull();
    expect(screen.queryByText("No resources")).toBeNull();
    expect(
      article?.querySelector('[data-testid="curated-related-docs"]'),
    ).toBeTruthy();

    const metadata = await buildDocsPageMetadata(["modules", slug]);
    expect(metadata.alternates?.canonical).toBe(expectedUrl);
  });
});

import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";

const VIETNAMESE_MODULE_EXPECTATIONS = [
  {
    slug: "sliding-window-attention",
    registryId: "module.sliding-window-attention",
    vietnameseDescription:
      "Một biến thể attention giới hạn mỗi query vào một cửa sổ cục bộ cố định thay vì toàn bộ chuỗi.",
    englishFallback:
      "An attention variant that restricts each query to a fixed local window of key positions instead of the full sequence.",
    vietnameseBody:
      "Sliding-window attention nhắm vào chi phí tính attention, băng thông bộ nhớ khi tạo ma trận điểm, và chi phí phục vụ chuỗi dài",
    graphCaption:
      "Chuyển giữa MHA và cửa sổ trượt để so sánh tầm nhìn toàn chuỗi với cửa sổ cục bộ cố định trên cùng một đồ thị",
    graphAlt:
      "So sánh tầm với của multi-head attention dày đặc và sliding-window attention cục bộ",
    tableCaption:
      "Cách sliding-window attention so với các biến thể attention lân cận",
    tableDimension: "Tính cục bộ của attention",
    graphLabel: "Mỗi query chỉ chạm tới các key lân cận trong cửa sổ trượt",
    expectedHrefs: [
      "/vi/tags/attention",
      "/vi/tags/context-window",
      "/vi/docs/modules/multi-head-attention",
      "/vi/docs/modules/multi-query-attention",
      "/vi/docs/modules/grouped-query-attention",
    ],
  },
  {
    slug: "linear-attention",
    registryId: "module.linear-attention",
    vietnameseDescription:
      "Một biến thể attention thay phép softmax dot-product tường minh bằng công thức kernel hoặc feature map có độ tăng gần tuyến tính theo độ dài chuỗi.",
    englishFallback:
      "An attention variant that replaces explicit softmax dot-product attention with kernel or feature-map formulations that scale near-linearly with sequence length.",
    vietnameseBody:
      "Linear attention nhắm vào độ tăng chi phí theo độ dài chuỗi, chi phí tính attention, và băng thông bộ nhớ",
    graphCaption:
      "Chuyển giữa MHA và linear attention để so sánh cách chấm điểm softmax đầy đủ với các phép cộng dồn kết hợp qua feature map trên cùng một đồ thị",
    graphAlt:
      "So sánh luồng tính của multi-head attention dày đặc và linear attention dùng feature map",
    tableCaption: "Cách linear attention so với các biến thể attention lân cận",
    tableDimension: "Độ tăng theo độ dài chuỗi",
    graphLabel:
      "Query đọc từ các bản tóm tắt đang chạy thay vì chấm điểm mọi key",
    expectedHrefs: [
      "/vi/tags/attention",
      "/vi/docs/modules/multi-head-attention",
      "/vi/docs/modules/multi-query-attention",
      "/vi/docs/modules/grouped-query-attention",
    ],
  },
] as const;

describe("Phase 4 Vietnamese long-context attention coverage", () => {
  test("Vietnamese shipped localized docs include sliding-window-attention and linear-attention", async () => {
    const pages = await loadShippedLocalizedDocsPages("vi");
    const docsSlugs = pages.map((page) => page.docsSlug);

    expect(docsSlugs).toContain("modules/sliding-window-attention");
    expect(docsSlugs).toContain("modules/linear-attention");
    expect(
      isShippedLocalizedDocsSlug("modules/sliding-window-attention", "vi"),
    ).toBe(true);
    expect(isShippedLocalizedDocsSlug("modules/linear-attention", "vi")).toBe(
      true,
    );
  });

  for (const expectation of VIETNAMESE_MODULE_EXPECTATIONS) {
    test(`/vi/docs/modules/${expectation.slug} ships Vietnamese copy, graph text, and locale-aware module chrome`, async () => {
      const page = await loadLocalDocsPage(
        {
          section: "modules",
          slug: expectation.slug,
        },
        "vi",
      );
      const html = renderToStaticMarkup(
        createElement(
          ModulePageProviders,
          {
            messages: page.messages,
            assets: page.assets,
            locale: "vi",
          },
          page.content,
        ),
      );

      expect(page.frontmatter.registryId).toBe(expectation.registryId);
      expect(page.messages.description).toBe(expectation.vietnameseDescription);
      expect(page.messages.description).not.toBe(expectation.englishFallback);
      expect(page.messages.sections?.whyItExists.body).toContain(
        expectation.vietnameseBody,
      );
      expect(page.messages.assets?.computeFlow?.alt).toBe(expectation.graphAlt);
      expect(
        Object.values(page.messages.tables?.comparison?.dimensions ?? {}).some(
          (dimension) => dimension === expectation.tableDimension,
        ),
      ).toBe(true);
      expect(
        Object.values(page.messages.graph?.nodes ?? {}).some(
          (node) => node.label === expectation.graphLabel,
        ),
      ).toBe(true);
      expect(html).not.toContain(expectation.englishFallback);
      expect(html).toContain(expectation.graphAlt);
      expect(html).toContain(expectation.tableDimension);

      for (const href of expectation.expectedHrefs) {
        expect(html).toContain(`href="${href}"`);
      }

      expect(html).not.toContain('href="/docs/modules/multi-head-attention"');
      expect(html).not.toContain('href="/docs/modules/multi-query-attention"');
      expect(html).not.toContain(
        'href="/docs/modules/grouped-query-attention"',
      );
    });
  }

  test("Vietnamese localized search metadata and search results include the long-context attention slice", async () => {
    const meta = await loadSearchResultMetaMap("vi");
    expect(
      meta.get("/vi/docs/modules/sliding-window-attention")?.description,
    ).toContain("cửa sổ cục bộ cố định");
    expect(
      meta.get("/vi/docs/modules/linear-attention")?.description,
    ).toContain("độ tăng gần tuyến tính theo độ dài chuỗi");

    const results = await docsSearchApi.search("gần tuyến tính", {
      locale: "vi",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (result) => result.url === "/vi/docs/modules/linear-attention",
      ),
    ).toBe(true);
  });
});

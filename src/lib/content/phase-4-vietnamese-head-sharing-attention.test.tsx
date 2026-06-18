import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";

const VIETNAMESE_MODULE_EXPECTATIONS = [
  {
    slug: "multi-head-attention",
    registryId: "module.multi-head-attention",
    vietnameseDescription:
      "Thiết kế attention cơ sở trong đó mỗi query head có cặp key-value head riêng.",
    englishFallback:
      "The baseline attention design that gives every query head its own key-value head pair.",
    vietnameseBody:
      "MHA nhắm tới độ phong phú biểu diễn: các query head khác nhau có thể chú ý tới những quan hệ khác nhau trong cùng một chuỗi mà không phải dùng chung tham số key-value.",
    graphCaption:
      "Chuyển giữa MHA và MQA để so sánh số query head với số KV head trên cùng một đồ thị",
    graphAlt:
      "So sánh số head giữa multi-head attention và multi-query attention",
    tableCaption: "Cách MHA so với các biến thể attention lân cận",
    tableDimension: "Số lượng KV head",
    graphLabel: "Mỗi query head có K và V riêng",
    expectedHrefs: [
      "/vi/tags/attention",
      "/vi/docs/modules/attention",
      "/vi/docs/modules/grouped-query-attention",
      "/vi/docs/modules/multi-query-attention",
    ],
  },
  {
    slug: "multi-query-attention",
    registryId: "module.multi-query-attention",
    vietnameseDescription:
      "Một biến thể attention cho mọi query head dùng chung một key-value head để giảm tối đa bộ nhớ KV cache.",
    englishFallback:
      "An attention variant that shares one key-value head across all query heads to minimize KV-cache memory.",
    vietnameseBody:
      "MQA nhắm vào dung lượng KV cache và băng thông bộ nhớ trong giải mã tự hồi quy.",
    graphCaption:
      "Chuyển giữa MHA và MQA để so sánh số query head với số KV head trên cùng một đồ thị",
    graphAlt:
      "So sánh số head giữa multi-head attention và multi-query attention",
    tableCaption: "Cách MQA so với các biến thể attention lân cận",
    tableDimension: "Số lượng KV head",
    graphLabel: "Một cặp key/value dùng chung phục vụ mọi query head",
    expectedHrefs: [
      "/vi/tags/attention",
      "/vi/tags/kv-cache",
      "/vi/docs/modules/attention",
      "/vi/docs/modules/grouped-query-attention",
      "/vi/docs/modules/multi-head-attention",
    ],
  },
] as const;

describe("Phase 4 Vietnamese head-sharing attention coverage", () => {
  test("Vietnamese shipped localized docs include multi-head-attention and multi-query-attention", async () => {
    const pages = await loadShippedLocalizedDocsPages("vi");
    const docsSlugs = pages.map((page) => page.docsSlug);

    expect(docsSlugs).toContain("modules/multi-head-attention");
    expect(docsSlugs).toContain("modules/multi-query-attention");
    expect(
      isShippedLocalizedDocsSlug("modules/multi-head-attention", "vi"),
    ).toBe(true);
    expect(
      isShippedLocalizedDocsSlug("modules/multi-query-attention", "vi"),
    ).toBe(true);
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
      expect(page.messages.sections?.whatItOptimizes.body).toContain(
        expectation.vietnameseBody,
      );
      expect(page.messages.assets?.computeFlow?.caption).toBe(
        expectation.graphCaption,
      );
      expect(page.messages.assets?.computeFlow?.alt).toBe(expectation.graphAlt);
      expect(page.messages.assets?.comparisonTable?.caption).toBe(
        expectation.tableCaption,
      );
      expect(page.messages.tables?.comparison?.dimensions?.kvHeadCount).toBe(
        expectation.tableDimension,
      );
      expect(
        Object.values(page.messages.graph?.nodes ?? {}).some(
          (node) => node.label === expectation.graphLabel,
        ),
      ).toBe(true);
      expect(html).not.toContain(expectation.englishFallback);
      expect(html).toContain(expectation.graphCaption);
      expect(html).toContain(expectation.graphAlt);
      expect(html).toContain(expectation.tableCaption);
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
});

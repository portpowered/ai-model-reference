import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadPageMessages } from "@/lib/content/page-messages-load";
import {
  isDocsPageShippedForLocale,
  loadShippedLocalizedDocsPages,
} from "@/lib/content/pages";
import type { PageAssetConfig } from "@/lib/content/schemas";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";

const VIETNAMESE_GLOSSARY_EXPECTATIONS = [
  {
    slug: "embedding",
    registryId: "concept.embedding",
    vietnameseDescription:
      "Một vector dày đặc biểu diễn token hoặc mục rời rạc khác để mô hình có thể chạy phép toán liên tục trên nó.",
    englishFallback:
      "A dense vector that represents a token or other discrete item so the model can run continuous math on it.",
    vietnameseBody:
      "Embedding là một danh sách số có độ dài cố định, tức một vector, gắn với một ký hiệu rời rạc như token ID.",
    expectedHrefs: [
      "/vi/tags/token-to-probability-chain",
      "/vi/tags/foundations",
    ],
    shellLocalizedHrefs: ["/vi/docs/glossary/token"],
    fallbackHref: "/docs/glossary/tensor",
    shellFallbackHref: "/docs/glossary/vector",
  },
  {
    slug: "logit",
    registryId: "concept.logit",
    vietnameseDescription:
      "Điểm số thô, chưa chuẩn hóa, cho từng mục trong từ vựng trước khi softmax biến các điểm đó thành xác suất.",
    englishFallback:
      "A raw, unnormalized score for each vocabulary item before softmax turns scores into probabilities.",
    vietnameseBody:
      "Logit là một điểm số thực gán cho một lựa chọn từ vựng tại một vị trí, thường do một ma trận trọng số tác động lên hidden state tạo ra.",
    expectedHrefs: [
      "/vi/tags/token-to-probability-chain",
      "/vi/tags/foundations",
      "/vi/docs/glossary/softmax",
    ],
    shellLocalizedHrefs: ["/vi/docs/glossary/softmax"],
  },
  {
    slug: "softmax",
    registryId: "concept.softmax",
    vietnameseDescription:
      "Hàm biến một vector logit thành phân phối xác suất có tổng bằng một.",
    englishFallback:
      "A function that turns a vector of logits into a probability distribution that sums to one.",
    vietnameseBody:
      "Softmax là bước chuẩn hóa cuối thường dùng cho đầu ra nhiều lớp của mô hình ngôn ngữ.",
    expectedHrefs: [
      "/vi/tags/token-to-probability-chain",
      "/vi/tags/foundations",
    ],
    shellLocalizedHrefs: ["/vi/docs/glossary/token"],
  },
] as const;

describe("Phase 4 Vietnamese probability-chain glossary coverage", () => {
  test("Vietnamese shipped localized docs include embedding, logit, and softmax", async () => {
    const pages = await loadShippedLocalizedDocsPages("vi");
    const docsSlugs = pages.map((page) => page.docsSlug);

    expect(docsSlugs).toContain("glossary/embedding");
    expect(docsSlugs).toContain("glossary/logit");
    expect(docsSlugs).toContain("glossary/softmax");
    expect(isShippedLocalizedDocsSlug("glossary/embedding", "vi")).toBe(true);
    expect(isShippedLocalizedDocsSlug("glossary/logit", "vi")).toBe(true);
    expect(isShippedLocalizedDocsSlug("glossary/softmax", "vi")).toBe(true);
    expect(isShippedLocalizedDocsSlug("glossary/tensor", "vi")).toBe(false);
  });

  for (const expectation of VIETNAMESE_GLOSSARY_EXPECTATIONS) {
    test(`/vi/docs/glossary/${expectation.slug} ships Vietnamese messages and locale-aware glossary chrome`, async () => {
      const messages = await loadPageMessages(
        join(GLOSSARY_DOCS_ROOT, expectation.slug),
        "vi",
      );
      const page = await loadLocalDocsPage(
        {
          section: "glossary",
          slug: expectation.slug,
        },
        "vi",
      );
      const html = renderToStaticMarkup(
        createElement(
          ModulePageProviders,
          {
            messages,
            assets: {} as PageAssetConfig,
            locale: "vi",
          },
          <>
            <TagPillList registryId={expectation.registryId} />
            <RelatedDocs registryId={expectation.registryId} />
          </>,
        ),
      );
      const shellHtml = renderGlossaryDocsShell(page, { locale: "vi" });

      expect(messages.description).toBe(expectation.vietnameseDescription);
      expect(messages.sections?.whatItIs.body).toContain(
        expectation.vietnameseBody,
      );
      expect(messages.description).not.toBe(expectation.englishFallback);
      expect(html).not.toContain(expectation.englishFallback);
      expect(shellHtml).not.toContain(expectation.englishFallback);

      for (const href of expectation.expectedHrefs) {
        expect(html).toContain(`href="${href}"`);
      }

      for (const href of expectation.shellLocalizedHrefs) {
        expect(shellHtml).toContain(`href="${href}"`);
      }

      if ("fallbackHref" in expectation) {
        expect(isDocsPageShippedForLocale("glossary/tensor", "vi")).toBe(false);
        expect(html).toContain(`href="${expectation.fallbackHref}"`);
        expect(html).not.toContain('href="/vi/docs/glossary/tensor"');
      }

      if ("shellFallbackHref" in expectation) {
        expect(shellHtml).toContain(`href="${expectation.shellFallbackHref}"`);
        expect(shellHtml).not.toContain('href="/vi/docs/glossary/vector"');
      }
    });
  }
});

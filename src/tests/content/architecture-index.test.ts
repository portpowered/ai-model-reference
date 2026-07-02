import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderArchitectureIndexPage } from "@/app/(site)/site-renderers";
import {
  type ArchitectureEntry,
  isArchitectureRelatedPage,
  loadPublishedArchitectureEntries,
  sortArchitectureEntriesByTitle,
} from "@/lib/content/architecture";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("isArchitectureRelatedPage", () => {
  it("includes merged published pages whose registry concept is architecture-related", async () => {
    const indexes = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const architecturePages = pages.filter((page) =>
      isArchitectureRelatedPage(page, indexes),
    );

    const urls = architecturePages.map((page) => page.url).sort();
    expect(urls).toEqual(
      expect.arrayContaining([
        "/docs/concepts/context-extension",
        "/docs/concepts/page-spec-workflow-sample",
        "/docs/concepts/positional-encodings",
        "/docs/concepts/prefill",
        "/docs/concepts/transformer-architecture",
        "/docs/concepts/why-long-context-is-hard",
        "/docs/glossary/architecture",
        "/docs/glossary/conditioning",
        "/docs/glossary/denoising-generation",
        "/docs/glossary/token",
        "/docs/glossary/transformer",
      ]),
    );
    expect(urls).not.toContain("/docs/glossary/activation");
  });

  it("excludes module pages that are not architecture concepts", async () => {
    const indexes = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const modulePage = pages.find(
      (page) => page.url === "/docs/modules/grouped-query-attention",
    );

    if (!modulePage) {
      throw new Error(
        "Expected grouped-query-attention module page in baseline",
      );
    }
    expect(isArchitectureRelatedPage(modulePage, indexes)).toBe(false);
  });
});

describe("loadPublishedArchitectureEntries", () => {
  it("returns the token glossary browse entry with title, summary, and URL", async () => {
    const entries = await loadPublishedArchitectureEntries("en");
    const token = entries.find((entry) => entry.url === "/docs/glossary/token");

    expect(token).toBeDefined();
    expect(token?.title).toBe("Token");
    expect(token?.summary.length).toBeGreaterThan(0);
    expect(token?.slug).toBe("glossary/token");
  });

  it("returns published architecture pages sorted alphabetically by title", async () => {
    const entries = await loadPublishedArchitectureEntries("en");
    for (let index = 1; index < entries.length; index += 1) {
      expect(
        entries[index - 1].title.localeCompare(entries[index].title, "en", {
          sensitivity: "base",
        }),
      ).toBeLessThanOrEqual(0);
    }
  });
});

describe("sortArchitectureEntriesByTitle", () => {
  it("sorts entries alphabetically by title", () => {
    const entries: ArchitectureEntry[] = [
      {
        title: "Transformer",
        summary: "Sequence model built from attention and feed-forward blocks.",
        url: "/docs/concepts/transformer",
        slug: "concepts/transformer",
      },
      {
        title: "Diffusion",
        summary: "Generative process that denoises samples over many steps.",
        url: "/docs/concepts/diffusion",
        slug: "concepts/diffusion",
      },
    ];

    expect(
      sortArchitectureEntriesByTitle(entries).map((entry) => entry.title),
    ).toEqual(["Diffusion", "Transformer"]);
  });
});

describe("architecture index messages", () => {
  it("loads localized copy for the architecture index page", async () => {
    const messages = await loadUiMessages();
    expect(messages.architectureIndex.title).toBe("Architecture");
    expect(messages.architectureIndex.emptyTitle.length).toBeGreaterThan(0);
    expect(messages.architectureIndex.emptyDescription.length).toBeGreaterThan(
      0,
    );
  });
});

describe("architecture index page render", () => {
  it("lists merged architecture glossary entries with localized titles", async () => {
    const page = await renderArchitectureIndexPage();
    const html = renderToStaticMarkup(page);

    for (const [title, href] of [
      ["Architecture", "/docs/glossary/architecture"],
      ["Foundation Model", "/docs/glossary/foundation-model"],
      ["KV cache", "/docs/glossary/kv-cache"],
      ["Decode", "/docs/glossary/decode"],
      ["Prefill", "/docs/concepts/prefill"],
      ["Positional encodings", "/docs/concepts/positional-encodings"],
      ["Token", "/docs/glossary/token"],
      ["Transformer architecture", "/docs/concepts/transformer-architecture"],
    ] as const) {
      expect(html).toContain(title);
      expect(html).toContain(`href="${href}"`);
    }

    expect(html).not.toContain("No architecture entries yet");
    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });

  it("renders localized vietnamese architecture entries when shipped page-local messages exist", async () => {
    const page = await renderArchitectureIndexPage("vi");
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Kiến trúc");
    expect(html).toContain("Kiến trúc transformer");
    expect(html).toContain('href="/vi/docs/concepts/transformer-architecture"');
    expect(html).toContain("Sinh tự hồi quy");
    expect(html).toContain(
      'href="/vi/docs/glossary/autoregressive-generation"',
    );
    expect(html).toContain("Token");
    expect(html).toContain('href="/vi/docs/glossary/token"');
    expect(html).not.toContain("Chưa có mục kiến trúc nào");
  });
});

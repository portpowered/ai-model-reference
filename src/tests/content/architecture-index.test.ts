import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
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
  it("includes published pages whose registry concept is architecture-related", async () => {
    const indexes = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const architecturePages = pages.filter((page) =>
      isArchitectureRelatedPage(page, indexes),
    );

    const urls = architecturePages.map((page) => page.url).sort();
    expect(urls).toEqual(
      [
        "/docs/concepts/transformer-architecture",
        "/docs/glossary/activation",
        "/docs/glossary/alignment",
        "/docs/glossary/architecture",
        "/docs/glossary/autoregressive-generation",
        "/docs/glossary/component",
        "/docs/glossary/computational-graph",
        "/docs/glossary/conditioning",
        "/docs/glossary/decoder",
        "/docs/glossary/denoising-generation",
        "/docs/glossary/diffusion-model",
        "/docs/glossary/discriminative-model",
        "/docs/glossary/embedding",
        "/docs/glossary/emergent-behavior",
        "/docs/glossary/encoder",
        "/docs/glossary/encoder-decoder",
        "/docs/glossary/foundation-model",
        "/docs/glossary/generalization",
        "/docs/glossary/generative-model",
        "/docs/glossary/latent",
        "/docs/glossary/latent-space",
        "/docs/glossary/modality",
        "/docs/glossary/model",
        "/docs/glossary/model-capacity",
        "/docs/glossary/module",
        "/docs/glossary/multimodal-model",
        "/docs/glossary/overfitting",
        "/docs/glossary/patch",
        "/docs/glossary/perplexity",
        "/docs/glossary/representation",
        "/docs/glossary/scaling-law",
        "/docs/glossary/token",
        "/docs/glossary/transformer",
        "/docs/glossary/world-model",
      ].sort(),
    );
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
  it("lists taxonomy glossary entries and token with localized titles", async () => {
    const page = await ArchitectureIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Architecture");
    expect(html).toContain('href="/docs/glossary/architecture"');
    expect(html).toContain("Foundation Model");
    expect(html).toContain('href="/docs/glossary/foundation-model"');
    expect(html).toContain("Token");
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).not.toContain("No architecture entries yet");
    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });
});

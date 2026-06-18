import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGlossaryIndexPage } from "@/app/(site)/site-renderers";
import {
  type GlossaryEntry,
  loadPublishedGlossaryEntries,
  sortGlossaryEntriesByTitle,
} from "@/lib/content/glossary";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("loadPublishedGlossaryEntries", () => {
  it("returns only published glossary pages sorted alphabetically by title", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    for (let index = 1; index < entries.length; index += 1) {
      expect(
        entries[index - 1].title.localeCompare(entries[index].title, "en", {
          sensitivity: "base",
        }),
      ).toBeLessThanOrEqual(0);
    }
  });

  it("includes the token glossary page with correct title and link", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    const token = entries.find((entry) => entry.slug === "glossary/token");
    expect(token).toBeDefined();
    expect(token?.title).toBe("Token");
    expect(token?.url).toBe("/docs/glossary/token");
    expect(token?.summary.length).toBeGreaterThan(0);
  });

  it("includes merged glossary entries with title and summary", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    expect(entries).toHaveLength(82);

    for (const [url, title] of [
      ["/docs/glossary/embedding", "Embedding"],
      ["/docs/glossary/tensor", "Tensor"],
      ["/docs/glossary/logit", "Logit"],
      ["/docs/glossary/softmax", "Softmax"],
      ["/docs/glossary/entropy", "Entropy"],
      ["/docs/glossary/temperature", "Temperature"],
      ["/docs/glossary/parameter", "Parameter"],
      ["/docs/glossary/activation", "Activation"],
      ["/docs/glossary/computational-graph", "Computational Graph"],
      ["/docs/glossary/gradient", "Gradient"],
      ["/docs/glossary/backpropagation", "Backpropagation"],
      ["/docs/glossary/loss-function", "Loss Function"],
      ["/docs/glossary/optimizer-state", "Optimizer State"],
      ["/docs/glossary/sampling-overview", "Sampling Overview"],
      ["/docs/glossary/greedy-decoding", "Greedy Decoding"],
      ["/docs/glossary/top-k-sampling", "Top-K Sampling"],
      ["/docs/glossary/top-p-sampling", "Top-P Sampling"],
      ["/docs/glossary/kv-cache", "KV cache"],
      ["/docs/glossary/decode", "Decode"],
      ["/docs/glossary/prefill", "Prefill"],
      ["/docs/glossary/prefill-decode-split", "Prefill/decode split"],
      [
        "/docs/modules/absolute-positional-embeddings",
        "Absolute positional embeddings",
      ],
      [
        "/docs/modules/learned-positional-embeddings",
        "Learned positional embeddings",
      ],
      ["/docs/modules/relative-position-bias", "Relative position bias"],
      ["/docs/modules/t5-relative-position-bias", "T5 relative position bias"],
      [
        "/docs/modules/sinusoidal-positional-embeddings",
        "Sinusoidal positional embeddings",
      ],
      ["/docs/modules/nope", "NoPE"],
      ["/docs/modules/ntk-aware-rope-scaling", "NTK-aware RoPE scaling"],
      ["/docs/modules/positional-interpolation", "Positional interpolation"],
      ["/docs/modules/superhot-rope", "SuperHOT RoPE"],
      ["/docs/modules/yarn", "YaRN"],
    ] as const) {
      const entry = entries.find((item) => item.url === url);
      expect(entry?.title).toBe(title);
      expect(entry?.summary.length).toBeGreaterThan(0);
    }
  });
});

describe("sortGlossaryEntriesByTitle", () => {
  it("sorts entries alphabetically by title", () => {
    const entries: GlossaryEntry[] = [
      {
        title: "Softmax",
        summary: "Normalizes logits into a probability distribution.",
        url: "/docs/glossary/softmax",
        slug: "glossary/softmax",
      },
      {
        title: "Embedding",
        summary: "A dense vector representation of a token or item.",
        url: "/docs/glossary/embedding",
        slug: "glossary/embedding",
      },
      {
        title: "Token",
        summary: "The smallest unit a model reads or writes.",
        url: "/docs/glossary/token",
        slug: "glossary/token",
      },
    ];

    expect(
      sortGlossaryEntriesByTitle(entries).map((entry) => entry.title),
    ).toEqual(["Embedding", "Softmax", "Token"]);
  });
});

describe("glossary index messages", () => {
  it("loads localized copy for the glossary index page", async () => {
    const messages = await loadUiMessages();
    expect(messages.glossaryIndex.title).toBe("Glossary");
    expect(messages.glossaryIndex.emptyTitle.length).toBeGreaterThan(0);
    expect(messages.glossaryIndex.emptyDescription.length).toBeGreaterThan(0);
  });
});

describe("glossary index page render", () => {
  it("lists merged glossary entries with localized titles", async () => {
    const page = await renderGlossaryIndexPage();
    const html = renderToStaticMarkup(page);

    for (const [title, href] of [
      ["Architecture", "/docs/glossary/architecture"],
      ["Generative Model", "/docs/glossary/generative-model"],
      ["Token", "/docs/glossary/token"],
      ["Embedding", "/docs/glossary/embedding"],
      ["Tensor", "/docs/glossary/tensor"],
      ["Logit", "/docs/glossary/logit"],
      ["Softmax", "/docs/glossary/softmax"],
      ["Entropy", "/docs/glossary/entropy"],
      ["Temperature", "/docs/glossary/temperature"],
      ["Parameter", "/docs/glossary/parameter"],
      ["Activation", "/docs/glossary/activation"],
      ["Computational Graph", "/docs/glossary/computational-graph"],
      ["Sampling Overview", "/docs/glossary/sampling-overview"],
      ["KV cache", "/docs/glossary/kv-cache"],
      ["Decode", "/docs/glossary/decode"],
      ["Prefill", "/docs/glossary/prefill"],
      [
        "Absolute positional embeddings",
        "/docs/modules/absolute-positional-embeddings",
      ],
      ["Relative position bias", "/docs/modules/relative-position-bias"],
    ] as const) {
      expect(html).toContain(title);
      expect(html).toContain(`href="${href}"`);
    }

    expect(html).not.toContain("No glossary entries yet");
    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });

  it("renders localized vietnamese glossary entries when shipped page-local messages exist", async () => {
    const page = await renderGlossaryIndexPage("vi");
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Thuật ngữ");
    expect(html).toContain("Sinh tự hồi quy");
    expect(html).toContain(
      'href="/vi/docs/glossary/autoregressive-generation"',
    );
    expect(html).toContain("Token");
    expect(html).toContain('href="/vi/docs/glossary/token"');
    expect(html).not.toContain("Chưa có mục thuật ngữ nào");
  });
});

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

  it("includes embedding and tensor chain glossary pages with title and summary", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    const embedding = entries.find(
      (entry) => entry.url === "/docs/glossary/embedding",
    );
    expect(embedding?.title).toBe("Embedding");
    expect(embedding?.summary.length).toBeGreaterThan(0);

    const tensor = entries.find(
      (entry) => entry.url === "/docs/glossary/tensor",
    );
    expect(tensor?.title).toBe("Tensor");
    expect(tensor?.summary.length).toBeGreaterThan(0);

    const logit = entries.find((entry) => entry.url === "/docs/glossary/logit");
    expect(logit?.title).toBe("Logit");
    expect(logit?.summary.length).toBeGreaterThan(0);

    const softmax = entries.find(
      (entry) => entry.url === "/docs/glossary/softmax",
    );
    expect(softmax?.title).toBe("Softmax");
    expect(softmax?.summary.length).toBeGreaterThan(0);

    const entropy = entries.find(
      (entry) => entry.url === "/docs/glossary/entropy",
    );
    expect(entropy?.title).toBe("Entropy");
    expect(entropy?.summary.length).toBeGreaterThan(0);

    const temperature = entries.find(
      (entry) => entry.url === "/docs/glossary/temperature",
    );
    expect(temperature?.title).toBe("Temperature");
    expect(temperature?.summary.length).toBeGreaterThan(0);

    const parameter = entries.find(
      (entry) => entry.url === "/docs/glossary/parameter",
    );
    expect(parameter?.title).toBe("Parameter");
    expect(parameter?.summary.length).toBeGreaterThan(0);

    const activation = entries.find(
      (entry) => entry.url === "/docs/glossary/activation",
    );
    expect(activation?.title).toBe("Activation");
    expect(activation?.summary.length).toBeGreaterThan(0);

    const computationalGraph = entries.find(
      (entry) => entry.url === "/docs/glossary/computational-graph",
    );
    expect(computationalGraph?.title).toBe("Computational Graph");
    expect(computationalGraph?.summary.length).toBeGreaterThan(0);

    const gradient = entries.find(
      (entry) => entry.url === "/docs/glossary/gradient",
    );
    expect(gradient?.title).toBe("Gradient");
    expect(gradient?.summary.length).toBeGreaterThan(0);

    const backpropagation = entries.find(
      (entry) => entry.url === "/docs/glossary/backpropagation",
    );
    expect(backpropagation?.title).toBe("Backpropagation");
    expect(backpropagation?.summary.length).toBeGreaterThan(0);

    const lossFunction = entries.find(
      (entry) => entry.url === "/docs/glossary/loss-function",
    );
    expect(lossFunction?.title).toBe("Loss Function");
    expect(lossFunction?.summary.length).toBeGreaterThan(0);

    const optimizerState = entries.find(
      (entry) => entry.url === "/docs/glossary/optimizer-state",
    );
    expect(optimizerState?.title).toBe("Optimizer State");
    expect(optimizerState?.summary.length).toBeGreaterThan(0);
  });

  it("includes all nine Phase 2 taxonomy glossary pages with localized titles", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    expect(entries).toHaveLength(54);

    const architecture = entries.find(
      (entry) => entry.url === "/docs/glossary/architecture",
    );
    expect(architecture?.title).toBe("Architecture");

    const foundationModel = entries.find(
      (entry) => entry.url === "/docs/glossary/foundation-model",
    );
    expect(foundationModel?.title).toBe("Foundation Model");
    expect(foundationModel?.title).not.toContain("-");

    const encoder = entries.find(
      (entry) => entry.url === "/docs/glossary/encoder",
    );
    expect(encoder?.title).toBe("Encoder");
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
  it("lists taxonomy glossary entries and token with localized titles", async () => {
    const page = await renderGlossaryIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Glossary");
    expect(html).toContain("Architecture");
    expect(html).toContain('href="/docs/glossary/architecture"');
    expect(html).toContain("Generative Model");
    expect(html).toContain('href="/docs/glossary/generative-model"');
    expect(html).toContain("Token");
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain("Embedding");
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain("Tensor");
    expect(html).toContain('href="/docs/glossary/tensor"');
    expect(html).toContain("Logit");
    expect(html).toContain('href="/docs/glossary/logit"');
    expect(html).toContain("Softmax");
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain("Entropy");
    expect(html).toContain('href="/docs/glossary/entropy"');
    expect(html).toContain("Temperature");
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain("Parameter");
    expect(html).toContain('href="/docs/glossary/parameter"');
    expect(html).toContain("Activation");
    expect(html).toContain('href="/docs/glossary/activation"');
    expect(html).toContain("Computational Graph");
    expect(html).toContain('href="/docs/glossary/computational-graph"');
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

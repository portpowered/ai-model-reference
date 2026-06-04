import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";
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

  it("includes all nine Phase 2 taxonomy glossary pages with localized titles", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    expect(entries).toHaveLength(10);

    const architecture = entries.find(
      (entry) => entry.url === "/docs/glossary/architecture",
    );
    expect(architecture?.title).toBe("Architecture");

    const foundationModel = entries.find(
      (entry) => entry.url === "/docs/glossary/foundation-model",
    );
    expect(foundationModel?.title).toBe("Foundation Model");
    expect(foundationModel?.title).not.toContain("-");
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
    const page = await GlossaryIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Glossary");
    expect(html).toContain("Architecture");
    expect(html).toContain('href="/docs/glossary/architecture"');
    expect(html).toContain("Generative Model");
    expect(html).toContain('href="/docs/glossary/generative-model"');
    expect(html).toContain("Token");
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).not.toContain("No glossary entries yet");
  });
});

import { describe, expect, it } from "bun:test";
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
  it("excludes glossary and module pages without architecture grouping", () => {
    const store = loadRegistry();
    const pages = loadPublishedDocsPages("en");
    const architecturePages = pages.filter((page) =>
      isArchitectureRelatedPage(page, store),
    );
    expect(architecturePages).toHaveLength(0);
  });
});

describe("loadPublishedArchitectureEntries", () => {
  it("returns published architecture pages sorted alphabetically by title", () => {
    const entries = loadPublishedArchitectureEntries("en");
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
  it("loads localized copy for the architecture index page", () => {
    const messages = loadUiMessages();
    expect(messages.architectureIndex.title).toBe("Architecture");
    expect(messages.architectureIndex.emptyTitle.length).toBeGreaterThan(0);
    expect(messages.architectureIndex.emptyDescription.length).toBeGreaterThan(
      0,
    );
  });
});

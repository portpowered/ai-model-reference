import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type DocsIndexEntry,
  DocsIndexEntryList,
} from "@/features/docs/components/DocsIndexEntryList";

const sampleEntries: DocsIndexEntry[] = [
  {
    slug: "glossary/token",
    title: "Token",
    summary: "The smallest unit a model reads or writes.",
    url: "/docs/glossary/token",
  },
  {
    slug: "glossary/embedding",
    title: "Embedding",
    summary: "A dense vector representation of a token or item.",
    url: "/docs/glossary/embedding",
  },
];

describe("DocsIndexEntryList", () => {
  test("renders list aria-label, entry titles, summaries, and link hrefs", () => {
    const html = renderToStaticMarkup(
      <DocsIndexEntryList
        entries={sampleEntries}
        listLabel="Glossary entries"
      />,
    );

    expect(html).toContain('aria-label="Glossary entries"');
    expect(html).toContain("Token");
    expect(html).toContain("The smallest unit a model reads or writes.");
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain("Embedding");
    expect(html).toContain("A dense vector representation of a token or item.");
    expect(html).toContain('href="/docs/glossary/embedding"');
  });

  test("uses bulletless list styling without list-disc", () => {
    const html = renderToStaticMarkup(
      <DocsIndexEntryList
        entries={sampleEntries}
        listLabel="Glossary entries"
      />,
    );

    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });
});

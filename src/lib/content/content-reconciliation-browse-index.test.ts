import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";

describe("Phase 2/3 reconciliation browse indexes (US-004)", () => {
  test("glossary and architecture index pages render representative browse links without list bullets", async () => {
    const glossaryHtml = renderToStaticMarkup(await GlossaryIndexPage());
    const architectureHtml = renderToStaticMarkup(
      await ArchitectureIndexPage(),
    );

    for (const url of [
      "/docs/glossary/normalization",
      "/docs/glossary/kv-cache",
      "/docs/glossary/token",
    ]) {
      expect(glossaryHtml).toContain(`href="${url}"`);
    }

    for (const url of [
      "/docs/concepts/transformer-architecture",
      "/docs/concepts/positional-encodings",
      "/docs/glossary/kv-cache",
      "/docs/glossary/token",
    ]) {
      expect(architectureHtml).toContain(`href="${url}"`);
    }

    expect(glossaryHtml).toContain("list-none");
    expect(glossaryHtml).not.toContain("list-disc");
    expect(architectureHtml).toContain("list-none");
    expect(architectureHtml).not.toContain("list-disc");
  });
});

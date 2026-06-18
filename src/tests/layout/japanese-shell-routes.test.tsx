import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  renderArchitectureIndexPage,
  renderGlossaryIndexPage,
} from "@/app/(site)/site-renderers";

describe("japanese localized shell routes", () => {
  test("render japanese shipped architecture and glossary entries without english fallback shell copy", async () => {
    const architectureHtml = renderToStaticMarkup(
      await renderArchitectureIndexPage("ja"),
    );
    const glossaryHtml = renderToStaticMarkup(
      await renderGlossaryIndexPage("ja"),
    );

    expect(architectureHtml).toContain("アーキテクチャ");
    expect(architectureHtml).toContain("Transformer architecture");
    expect(architectureHtml).toContain(
      'href="/ja/docs/concepts/transformer-architecture"',
    );
    expect(architectureHtml).toContain("トークン");
    expect(architectureHtml).toContain('href="/ja/docs/glossary/token"');
    expect(architectureHtml).not.toContain(
      "アーキテクチャ項目はまだありません",
    );
    expect(architectureHtml).not.toContain("Architecture");

    expect(glossaryHtml).toContain("用語集");
    expect(glossaryHtml).toContain("トークン");
    expect(glossaryHtml).toContain('href="/ja/docs/glossary/token"');
    expect(glossaryHtml).not.toContain("用語集の項目はまだありません");
    expect(glossaryHtml).not.toContain("Glossary");
  });
});

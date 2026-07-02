import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  renderArchitectureIndexPage,
  renderGlossaryIndexPage,
} from "@/app/(site)/site-renderers";

describe("japanese localized shell routes", () => {
  test("render japanese architecture and glossary indexes with the shipped docs slice only", async () => {
    const architectureHtml = renderToStaticMarkup(
      await renderArchitectureIndexPage("ja"),
    );
    const glossaryHtml = renderToStaticMarkup(
      await renderGlossaryIndexPage("ja"),
    );

    expect(architectureHtml).toContain("アーキテクチャ");
    expect(architectureHtml).toContain("Transformer アーキテクチャ");
    expect(architectureHtml).toContain(
      'href="/ja/docs/concepts/transformer-architecture"',
    );
    expect(architectureHtml).toContain("Token");
    expect(architectureHtml).toContain('href="/ja/docs/glossary/token"');
    expect(architectureHtml).not.toContain(
      "アーキテクチャ項目はまだありません",
    );
    expect(architectureHtml).not.toContain(
      'href="/ja/docs/concepts/positional-encodings"',
    );

    expect(glossaryHtml).toContain("用語集");
    expect(glossaryHtml).toContain("Token");
    expect(glossaryHtml).toContain('href="/ja/docs/glossary/token"');
    expect(glossaryHtml).not.toContain("用語集の項目はまだありません");
    expect(glossaryHtml).not.toContain('href="/ja/docs/glossary/vector"');
  });
});

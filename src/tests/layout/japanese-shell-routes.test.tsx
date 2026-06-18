import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  renderArchitectureIndexPage,
  renderGlossaryIndexPage,
} from "@/app/(site)/site-renderers";

describe("japanese localized shell routes", () => {
  test("render japanese empty-state shell copy without requiring translated docs pages", async () => {
    const architectureHtml = renderToStaticMarkup(
      await renderArchitectureIndexPage("ja"),
    );
    const glossaryHtml = renderToStaticMarkup(
      await renderGlossaryIndexPage("ja"),
    );

    expect(architectureHtml).toContain("アーキテクチャ");
    expect(architectureHtml).toContain("アーキテクチャ項目はまだありません");
    expect(architectureHtml).toContain("ホームに戻る");
    expect(architectureHtml).toContain("検索を開く");
    expect(architectureHtml).not.toContain("Architecture");

    expect(glossaryHtml).toContain("用語集");
    expect(glossaryHtml).toContain("用語集の項目はまだありません");
    expect(glossaryHtml).toContain("ホームに戻る");
    expect(glossaryHtml).toContain("検索を開く");
    expect(glossaryHtml).not.toContain("Glossary");
  });
});

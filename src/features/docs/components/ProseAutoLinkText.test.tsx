import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";

describe("ProseAutoLinkText", () => {
  test("renders internal links for recognizable module aliases", () => {
    const html = renderToStaticMarkup(
      <ProseAutoLinkText text="Compared with multi-head attention and multi-query attention." />,
    );

    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('data-prose-auto-link="true"');
  });

  test("leaves ambiguous or unknown phrases as plain text", () => {
    const html = renderToStaticMarkup(
      <ProseAutoLinkText text="Unknown phraseology without registry matches." />,
    );

    expect(html).not.toContain("data-prose-auto-link");
    expect(html).toContain("Unknown phraseology without registry matches.");
  });
});

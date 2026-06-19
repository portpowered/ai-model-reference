import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";

describe("RelatedDocs", () => {
  test("renders routing as a curated related destination from nearby shipped pages", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.mixture-of-experts" />,
    );

    expect(html).toContain('href="/docs/systems/routing"');
    expect(html).toContain(">request routing<");
  });
});

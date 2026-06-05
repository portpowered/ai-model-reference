import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HomeBrowseLink,
  HomeBrowseList,
} from "@/components/home/home-browse-link";

describe("HomeBrowseList", () => {
  test("uses bulletless list styling without list-disc", () => {
    const html = renderToStaticMarkup(
      <HomeBrowseList ariaLabel="Browse">
        <HomeBrowseLink href="/tags" title="Tags" description="Browse by tag" />
      </HomeBrowseList>,
    );

    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });
});

describe("HomeBrowseLink", () => {
  test("renders card link without persistent underline utilities", () => {
    const html = renderToStaticMarkup(
      <HomeBrowseLink
        href="/docs/architecture"
        title="Architecture"
        description="System overview"
      />,
    );

    expect(html).toContain("no-underline");
    const withoutNoUnderline = html.replaceAll("no-underline", "");
    expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("hover:border-ring");
    expect(html).toContain("Architecture");
  });
});

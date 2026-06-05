import { describe, expect, test } from "bun:test";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

describe("local docs page TOC", () => {
  test("token page exposes section heading anchors in TOC order", async () => {
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });

    expect(page.toc.length).toBeGreaterThan(0);
    expect(page.toc[0]).toEqual({
      title: "What It Is",
      url: "#what-it-is",
      depth: 2,
    });
    expect(page.toc.some((item) => item.url === "#why-it-matters")).toBe(true);
    expect(page.toc.some((item) => item.title === "References")).toBe(true);
  });

  test("grouped-query-attention page exposes module section TOC entries", async () => {
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: "grouped-query-attention",
    });

    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    expect(
      page.toc.some((item) => item.title === "Compared To Nearby Modules"),
    ).toBe(true);
    expect(
      page.toc.some((item) => item.title === "Variants And Nearby Modules"),
    ).toBe(false);
  });
});

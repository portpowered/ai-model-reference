import { describe, expect, test } from "bun:test";
import {
  isLocalMessageDocsPage,
  loadLocalDocsPage,
  parseLocalDocsPageRef,
} from "@/lib/content/local-docs-page";
import { source } from "@/lib/source";

describe("parseLocalDocsPageRef", () => {
  test("returns glossary ref for glossary slugs", () => {
    expect(parseLocalDocsPageRef(["glossary", "token"])).toEqual({
      section: "glossary",
      slug: "token",
    });
  });

  test("returns module ref for module slugs", () => {
    expect(
      parseLocalDocsPageRef(["modules", "grouped-query-attention"]),
    ).toEqual({
      section: "modules",
      slug: "grouped-query-attention",
    });
  });

  test("returns null for non-local docs paths", () => {
    expect(parseLocalDocsPageRef(["getting-started"])).toBeNull();
    expect(parseLocalDocsPageRef(undefined)).toBeNull();
  });
});

describe("isLocalMessageDocsPage", () => {
  test("detects local message namespace frontmatter", () => {
    expect(isLocalMessageDocsPage({ messageNamespace: "local" })).toBe(true);
    expect(isLocalMessageDocsPage({ messageNamespace: "shared" })).toBe(false);
  });
});

describe("docs source local pages", () => {
  test("exposes representative glossary and module slugs for static export", () => {
    const tokenPage = source.getPage(["glossary", "token"]);
    const modulePage = source.getPage(["modules", "grouped-query-attention"]);

    expect(tokenPage).toBeDefined();
    expect(modulePage).toBeDefined();
    expect(tokenPage?.url).toBe("/docs/glossary/token");
    expect(modulePage?.url).toBe("/docs/modules/grouped-query-attention");
  });

  test("generateParams includes representative published glossary and module slugs", () => {
    const params = source.generateParams();
    const slugParams = params.map((entry) => entry.slug);
    expect(slugParams).toContainEqual(["glossary", "token"]);
    expect(slugParams).toContainEqual(["modules", "grouped-query-attention"]);
  });

  test("loadLocalDocsPage resolves localized metadata for glossary pages", async () => {
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });

    expect(page.messages.title).toBe("Token");
    expect(page.messages.description?.length).toBeGreaterThan(0);
    expect(page.frontmatter.registryId).toBe("concept.token");
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
  });
});

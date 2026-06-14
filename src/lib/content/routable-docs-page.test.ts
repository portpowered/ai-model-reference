import { describe, expect, test } from "bun:test";
import {
  isLocalDocsPageBundlePath,
  isRoutableLocalDocsPageData,
  shouldExcludeLocalDocsPageFromRouting,
} from "@/lib/content/routable-docs-page";
import { source } from "@/lib/source";

describe("routable local docs pages", () => {
  test("identifies concepts, glossary, and module page bundle paths", () => {
    expect(isLocalDocsPageBundlePath("concepts/foo/page.mdx")).toBe(true);
    expect(isLocalDocsPageBundlePath("glossary/token/page.mdx")).toBe(true);
    expect(isLocalDocsPageBundlePath("modules/attention/page.mdx")).toBe(true);
    expect(isLocalDocsPageBundlePath("getting-started.mdx")).toBe(false);
    expect(isLocalDocsPageBundlePath("models/foo/page.mdx")).toBe(false);
  });

  test("requires published status for local message bundles", () => {
    expect(
      isRoutableLocalDocsPageData({
        messageNamespace: "local",
        status: "published",
      }),
    ).toBe(true);
    expect(
      isRoutableLocalDocsPageData({
        messageNamespace: "local",
        status: "draft",
      }),
    ).toBe(false);
    expect(
      isRoutableLocalDocsPageData({
        messageNamespace: "shared",
        status: "draft",
      }),
    ).toBe(true);
  });

  test("flags draft local docs bundles for routing exclusion", () => {
    expect(
      shouldExcludeLocalDocsPageFromRouting("concepts/foo/page.mdx", {
        messageNamespace: "local",
        status: "draft",
      }),
    ).toBe(true);
    expect(
      shouldExcludeLocalDocsPageFromRouting("concepts/foo/page.mdx", {
        messageNamespace: "local",
        status: "published",
      }),
    ).toBe(false);
  });

  test("draft maintainer sample is excluded from Fumadocs source routing", () => {
    expect(
      source.getPage(["concepts", "page-spec-workflow-sample"]),
    ).toBeUndefined();

    const slugPaths = source
      .generateParams()
      .map((entry) => entry.slug.join("/"));
    expect(slugPaths).not.toContain("concepts/page-spec-workflow-sample");
  });

  test("published local docs bundles remain routable", () => {
    expect(source.getPage(["glossary", "token"])).toBeDefined();
    expect(
      source.getPage(["concepts", "transformer-architecture"]),
    ).toBeDefined();
    expect(source.getPage(["modules", "attention"])).toBeDefined();
  });
});

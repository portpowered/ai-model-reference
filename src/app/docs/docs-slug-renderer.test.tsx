import { describe, expect, test } from "bun:test";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";

describe("docs slug renderer locale gating", () => {
  test("English docs metadata omits unshipped Vietnamese alternates", async () => {
    const metadata = await buildDocsPageMetadata(["getting-started"]);

    expect(metadata.alternates).toEqual({
      canonical: "/docs/getting-started",
      languages: {
        en: "/docs/getting-started",
      },
    });
  });

  test("English docs metadata advertises shipped Vietnamese alternates", async () => {
    const metadata = await buildDocsPageMetadata([
      "modules",
      "grouped-query-attention",
    ]);

    expect(metadata.alternates).toEqual({
      canonical: "/docs/modules/grouped-query-attention",
      languages: {
        en: "/docs/modules/grouped-query-attention",
        vi: "/vi/docs/modules/grouped-query-attention",
      },
    });
  });

  test("English docs metadata advertises shipped Vietnamese alternates for newly localized head-sharing modules", async () => {
    const multiHeadMetadata = await buildDocsPageMetadata([
      "modules",
      "multi-head-attention",
    ]);
    const multiQueryMetadata = await buildDocsPageMetadata([
      "modules",
      "multi-query-attention",
    ]);

    expect(multiHeadMetadata.alternates).toEqual({
      canonical: "/docs/modules/multi-head-attention",
      languages: {
        en: "/docs/modules/multi-head-attention",
        vi: "/vi/docs/modules/multi-head-attention",
      },
    });
    expect(multiQueryMetadata.alternates).toEqual({
      canonical: "/docs/modules/multi-query-attention",
      languages: {
        en: "/docs/modules/multi-query-attention",
        vi: "/vi/docs/modules/multi-query-attention",
      },
    });
  });

  test("unshipped Vietnamese docs routes fail clearly instead of rendering English content", async () => {
    try {
      await renderDocsSlugPage(["getting-started"], "vi");
      throw new Error("Expected Vietnamese unshipped route to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });
});

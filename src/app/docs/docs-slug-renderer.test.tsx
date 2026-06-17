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

  test("unshipped Vietnamese docs routes fail clearly instead of rendering English content", async () => {
    await expect(renderDocsSlugPage(["getting-started"], "vi")).rejects.toThrow(
      "notFound()",
    );
  });
});

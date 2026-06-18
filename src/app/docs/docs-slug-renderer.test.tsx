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

  test("English docs metadata advertises shipped Vietnamese alternates for newly localized long-context modules", async () => {
    const slidingWindowMetadata = await buildDocsPageMetadata([
      "modules",
      "sliding-window-attention",
    ]);
    const linearAttentionMetadata = await buildDocsPageMetadata([
      "modules",
      "linear-attention",
    ]);

    expect(slidingWindowMetadata.alternates).toEqual({
      canonical: "/docs/modules/sliding-window-attention",
      languages: {
        en: "/docs/modules/sliding-window-attention",
        vi: "/vi/docs/modules/sliding-window-attention",
      },
    });
    expect(linearAttentionMetadata.alternates).toEqual({
      canonical: "/docs/modules/linear-attention",
      languages: {
        en: "/docs/modules/linear-attention",
        vi: "/vi/docs/modules/linear-attention",
      },
    });
  });

  test("English docs metadata omits unshipped Vietnamese alternate for kv-cache", async () => {
    const metadata = await buildDocsPageMetadata(["glossary", "kv-cache"]);

    expect(metadata.alternates).toEqual({
      canonical: "/docs/glossary/kv-cache",
      languages: {
        en: "/docs/glossary/kv-cache",
      },
    });
  });

  test("English docs metadata omits unshipped Vietnamese alternate for prefill", async () => {
    const metadata = await buildDocsPageMetadata(["glossary", "prefill"]);

    expect(metadata.alternates).toEqual({
      canonical: "/docs/glossary/prefill",
      languages: {
        en: "/docs/glossary/prefill",
      },
    });
  });

  test("English docs metadata omits unshipped Vietnamese alternate for decode", async () => {
    const metadata = await buildDocsPageMetadata(["glossary", "decode"]);

    expect(metadata.alternates).toEqual({
      canonical: "/docs/glossary/decode",
      languages: {
        en: "/docs/glossary/decode",
      },
    });
  });

  test("English docs metadata omits unshipped Vietnamese alternate for prefill-decode-split", async () => {
    const metadata = await buildDocsPageMetadata([
      "glossary",
      "prefill-decode-split",
    ]);

    expect(metadata.alternates).toEqual({
      canonical: "/docs/glossary/prefill-decode-split",
      languages: {
        en: "/docs/glossary/prefill-decode-split",
      },
    });
  });

  test("English docs metadata omits unshipped Vietnamese alternate for time-to-first-token", async () => {
    const metadata = await buildDocsPageMetadata([
      "glossary",
      "time-to-first-token",
    ]);

    expect(metadata.alternates).toEqual({
      canonical: "/docs/glossary/time-to-first-token",
      languages: {
        en: "/docs/glossary/time-to-first-token",
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

  test("unshipped Vietnamese kv-cache route fails instead of rendering English content", async () => {
    try {
      await renderDocsSlugPage(["glossary", "kv-cache"], "vi");
      throw new Error("Expected Vietnamese KV cache route to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });

  test("unshipped Vietnamese prefill route fails instead of rendering English content", async () => {
    try {
      await renderDocsSlugPage(["glossary", "prefill"], "vi");
      throw new Error("Expected Vietnamese prefill route to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });

  test("unshipped Vietnamese decode route fails instead of rendering English content", async () => {
    try {
      await renderDocsSlugPage(["glossary", "decode"], "vi");
      throw new Error("Expected Vietnamese decode route to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });

  test("unshipped Vietnamese prefill-decode-split route fails instead of rendering English content", async () => {
    try {
      await renderDocsSlugPage(["glossary", "prefill-decode-split"], "vi");
      throw new Error("Expected Vietnamese prefill/decode split route to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });

  test("unshipped Vietnamese time-to-first-token route fails instead of rendering English content", async () => {
    try {
      await renderDocsSlugPage(["glossary", "time-to-first-token"], "vi");
      throw new Error("Expected Vietnamese time-to-first-token route to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });
});

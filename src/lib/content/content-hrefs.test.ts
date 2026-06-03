import { describe, expect, test } from "bun:test";
import { glossaryPageHref, modulePageHref } from "@/lib/content/content-hrefs";

describe("content-hrefs", () => {
  test("glossaryPageHref builds canonical glossary docs URL", () => {
    expect(glossaryPageHref("token")).toBe("/docs/glossary/token");
  });

  test("modulePageHref builds canonical module docs paths", () => {
    expect(modulePageHref("grouped-query-attention")).toBe(
      "/docs/modules/grouped-query-attention",
    );
  });
});

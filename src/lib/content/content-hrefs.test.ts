import { describe, expect, test } from "bun:test";
import {
  conceptPageHref,
  glossaryPageHref,
  modulePageHref,
} from "@/lib/content/content-hrefs";

describe("content-hrefs", () => {
  test("glossaryPageHref builds canonical glossary docs URL", () => {
    expect(glossaryPageHref("token")).toBe("/docs/glossary/token");
  });

  test("conceptPageHref builds canonical concept docs URL", () => {
    expect(conceptPageHref("transformer-architecture")).toBe(
      "/docs/concepts/transformer-architecture",
    );
  });

  test("modulePageHref builds canonical module docs paths", () => {
    expect(modulePageHref("grouped-query-attention")).toBe(
      "/docs/modules/grouped-query-attention",
    );
  });
});

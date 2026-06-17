import { describe, expect, test } from "bun:test";
import {
  conceptPageHref,
  glossaryPageHref,
  modulePageHref,
  tagPageHref,
} from "@/lib/content/content-hrefs";

describe("content-hrefs", () => {
  test("glossaryPageHref builds canonical glossary docs URL", () => {
    expect(glossaryPageHref("token")).toBe("/docs/glossary/token");
    expect(glossaryPageHref("token", "vi")).toBe("/vi/docs/glossary/token");
  });

  test("conceptPageHref builds canonical concept docs URL", () => {
    expect(conceptPageHref("transformer-architecture")).toBe(
      "/docs/concepts/transformer-architecture",
    );
    expect(conceptPageHref("transformer-architecture", "vi")).toBe(
      "/vi/docs/concepts/transformer-architecture",
    );
  });

  test("modulePageHref builds canonical module docs paths", () => {
    expect(modulePageHref("grouped-query-attention")).toBe(
      "/docs/modules/grouped-query-attention",
    );
    expect(modulePageHref("grouped-query-attention", "vi")).toBe(
      "/vi/docs/modules/grouped-query-attention",
    );
  });

  test("tagPageHref builds canonical tag landing paths", () => {
    expect(tagPageHref("attention")).toBe("/tags/attention");
    expect(tagPageHref("attention", "vi")).toBe("/vi/tags/attention");
  });
});

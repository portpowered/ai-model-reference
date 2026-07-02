import { describe, expect, test } from "bun:test";
import {
  buildProseAutoLinkPhraseIndex,
  buildProseAutoLinkPhrases,
  expandPhraseVariants,
  segmentProseWithAutoLinks,
} from "@/lib/content/prose-auto-link";

describe("prose auto-link", () => {
  test("expandPhraseVariants includes space and hyphen forms", () => {
    expect(expandPhraseVariants("KV cache")).toEqual(
      expect.arrayContaining(["KV cache", "KV-cache"]),
    );
  });

  test("buildProseAutoLinkPhraseIndex omits ambiguous phrases", () => {
    const index = buildProseAutoLinkPhraseIndex([
      { phrase: "attention", href: "/tags/attention" },
      { phrase: "attention", href: "/docs/glossary/attention" },
      { phrase: "attention", href: "/docs/modules/attention" },
    ]);

    expect(index.has("attention")).toBe(false);
  });

  test("buildProseAutoLinkPhraseIndex prefers canonical docs routes over tag routes when the tag is the only collision", () => {
    const index = buildProseAutoLinkPhraseIndex([
      { phrase: "FFN", href: "/docs/modules/feed-forward-network" },
      { phrase: "ffn", href: "/tags/feed-forward" },
    ]);

    expect(index.get("ffn")).toBe("/docs/modules/feed-forward-network");
  });

  test("buildProseAutoLinkPhraseIndex keeps unambiguous phrases", () => {
    const index = buildProseAutoLinkPhraseIndex([
      {
        phrase: "multi-head attention",
        href: "/docs/modules/multi-head-attention",
      },
      { phrase: "KV cache", href: "/tags/kv-cache" },
    ]);

    expect(index.get("multi-head attention")).toBe(
      "/docs/modules/multi-head-attention",
    );
    expect(index.get("kv cache")).toBe("/tags/kv-cache");
    expect(index.get("kv-cache")).toBe("/tags/kv-cache");
  });

  test("segmentProseWithAutoLinks links published aliases with word boundaries", () => {
    const phrases = buildProseAutoLinkPhrases([
      {
        phrase: "multi-head attention",
        href: "/docs/modules/multi-head-attention",
      },
      { phrase: "KV cache", href: "/tags/kv-cache" },
    ]);

    const segments = segmentProseWithAutoLinks(
      "Derived from multi-head attention with a smaller KV-cache footprint.",
      phrases,
    );

    expect(segments).toEqual([
      { type: "text", value: "Derived from " },
      {
        type: "link",
        value: "multi-head attention",
        href: "/docs/modules/multi-head-attention",
      },
      { type: "text", value: " with a smaller " },
      {
        type: "link",
        value: "KV-cache",
        href: "/tags/kv-cache",
      },
      { type: "text", value: " footprint." },
    ]);
  });

  test("segmentProseWithAutoLinks avoids partial substring matches", () => {
    const phrases = buildProseAutoLinkPhrases([
      { phrase: "KV cache", href: "/tags/kv-cache" },
    ]);

    const segments = segmentProseWithAutoLinks(
      "KV caches grow quickly.",
      phrases,
    );

    expect(segments).toEqual([
      { type: "text", value: "KV caches grow quickly." },
    ]);
  });

  test("segmentProseWithAutoLinks does not link slug prefixes inside hyphen compounds", () => {
    const phrases = buildProseAutoLinkPhrases([
      { phrase: "Decoder", href: "/docs/glossary/decoder" },
    ]);

    const segments = segmentProseWithAutoLinks(
      "Large decoder-only language models.",
      phrases,
    );

    expect(segments).toEqual([
      { type: "text", value: "Large decoder-only language models." },
    ]);
  });

  test("segmentProseWithAutoLinks leaves unknown phrases plain", () => {
    const phrases = buildProseAutoLinkPhrases([
      {
        phrase: "multi-head attention",
        href: "/docs/modules/multi-head-attention",
      },
    ]);

    const segments = segmentProseWithAutoLinks(
      "No recognizable references here.",
      phrases,
    );

    expect(segments).toEqual([
      { type: "text", value: "No recognizable references here." },
    ]);
  });
});

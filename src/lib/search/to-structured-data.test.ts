import { describe, expect, test } from "bun:test";
import { toStructuredData } from "./to-structured-data";
import type { SearchDocument } from "./types";

const SAMPLE_DOCUMENT: SearchDocument = {
  id: "/docs/modules/attention",
  registryId: "module.attention",
  url: "/docs/modules/attention",
  kind: "module",
  title: "Attention",
  description: "How transformer blocks mix information across token positions.",
  bodyText: "Attention lets each token read information from other tokens.",
  headings: ["What It Is", "Why It Matters"],
  aliases: ["attention", "self-attention"],
  tags: ["attention"],
  relatedIds: [],
  facets: {
    kind: "module",
    tags: ["attention"],
    moduleType: "attention",
    moduleFamily: "attention",
  },
};

describe("toStructuredData", () => {
  test("preserves repeated exact-match keywords from title, slug, aliases, and tags", () => {
    const structuredData = toStructuredData(SAMPLE_DOCUMENT);
    const keywordContents = structuredData.contents
      .filter((block) => block.heading === undefined)
      .map((block) => block.content);

    expect(keywordContents).toEqual(
      expect.arrayContaining(["Attention", "attention", "self-attention"]),
    );
    expect(
      keywordContents.filter((content) => content === "attention"),
    ).toEqual([
      "attention",
      "attention",
      "attention",
      "attention",
      "attention",
    ]);
  });
});

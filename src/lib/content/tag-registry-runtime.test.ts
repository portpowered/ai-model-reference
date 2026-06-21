import { describe, expect, test } from "bun:test";
import { getTagById, listTagRecords } from "@/lib/content/tag-registry-runtime";

const REPRESENTATIVE_TAGS = [
  {
    id: "tag.taxonomy",
    slug: "taxonomy",
    category: "architecture",
    landingPage: "generated-tag-page",
  },
  {
    id: "tag.model-family",
    slug: "model-family",
    category: "model-family",
    landingPage: "generated-tag-page",
  },
] as const;

describe("tag registry runtime", () => {
  test("getTagById resolves representative published tags through the derived runtime bridge", () => {
    for (const fixture of REPRESENTATIVE_TAGS) {
      const tag = getTagById(fixture.id);
      expect(tag?.slug).toBe(fixture.slug);
      expect(tag?.status).toBe("published");
      expect(tag?.category).toBe(fixture.category);
      expect(tag?.landingPage).toBe(fixture.landingPage);
    }
  });

  test("listTagRecords round-trips representative tag lookups without asserting a full inventory", () => {
    const records = listTagRecords();
    const ids = new Set(records.map((record) => record.id));

    expect(records.length).toBeGreaterThan(0);
    expect(ids.size).toBe(records.length);

    for (const fixture of REPRESENTATIVE_TAGS) {
      expect(ids.has(fixture.id)).toBe(true);
      expect(records.find((record) => record.id === fixture.id)).toEqual(
        getTagById(fixture.id),
      );
    }
  });
});

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TagsIndexList } from "@/features/docs/tags/TagsIndexList";
import type { TagIndexCategoryGroup } from "@/lib/content/tags";

const sampleGroups: TagIndexCategoryGroup[] = [
  {
    category: "module-type",
    categoryLabel: "Module type",
    tags: [
      {
        slug: "attention",
        title: "Attention",
        summary: "Attention mechanisms",
        url: "/tags/attention",
        category: "module-type",
        categoryLabel: "Module type",
      },
    ],
  },
];

describe("TagsIndexList", () => {
  test("omits mt-8 on the grouped list root section", () => {
    const html = renderToStaticMarkup(
      <TagsIndexList groups={sampleGroups} listLabel="Tags" />,
    );

    expect(html).toContain('aria-label="Tags"');
    expect(html).not.toContain("mt-8");
  });

  test("uses bulletless list styling without list-disc", () => {
    const html = renderToStaticMarkup(
      <TagsIndexList groups={sampleGroups} listLabel="Tags" />,
    );

    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });
});

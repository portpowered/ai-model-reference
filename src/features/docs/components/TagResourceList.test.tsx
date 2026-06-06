import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TagResourceList } from "@/features/docs/components/TagResourceList";
import type { TagResourceKindGroup } from "@/lib/content/tag-resources";

const sampleGroups: TagResourceKindGroup[] = [
  {
    kind: "module",
    kindLabel: "Module",
    resources: [
      {
        title: "Grouped-Query Attention",
        summary: "GQA module",
        url: "/docs/modules/grouped-query-attention",
        slug: "grouped-query-attention",
        kind: "module",
      },
    ],
  },
];

describe("TagResourceList", () => {
  test("omits mt-8 on the grouped list root section", () => {
    const html = renderToStaticMarkup(
      <TagResourceList groups={sampleGroups} listLabel="Resources" />,
    );

    expect(html).toContain('aria-label="Resources"');
    expect(html).not.toContain("mt-8");
  });

  test("uses bulletless list styling without list-disc", () => {
    const html = renderToStaticMarkup(
      <TagResourceList groups={sampleGroups} listLabel="Resources" />,
    );

    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });

  test("renders card links without persistent underline utilities", () => {
    const html = renderToStaticMarkup(
      <TagResourceList groups={sampleGroups} listLabel="Resources" />,
    );

    expect(html).toContain("no-underline");
    expect(html).toContain("hover:no-underline");
    const withoutNoUnderline = html.replaceAll("no-underline", "");
    expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);
    expect(html).toContain("focus-visible:ring-2");
  });
});

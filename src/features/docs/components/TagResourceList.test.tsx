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

  test("renders blog published dates and supplemental tag pills", () => {
    const html = renderToStaticMarkup(
      <TagResourceList
        groups={[
          {
            kind: "blog",
            kindLabel: "Blog",
            resources: [
              {
                title: "Why throughput follows a roofline",
                summary: "Roofline explainer",
                url: "/blog/roofline-throughput-explorer",
                slug: "roofline-throughput-explorer",
                kind: "blog",
                publishedAt: "2026-07-02",
                tags: ["foundations", "kv-cache"],
              },
            ],
          },
        ]}
        listLabel="Resources"
        tagSlug="kv-cache"
        locale="en"
      />,
    );

    expect(html).toContain('dateTime="2026-07-02"');
    expect(html).toContain("July 2026");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).not.toContain('href="/tags/kv-cache"');
  });

  test("keeps blog tag pills when every tag matches the active tag slug", () => {
    const html = renderToStaticMarkup(
      <TagResourceList
        groups={[
          {
            kind: "blog",
            kindLabel: "Blog",
            resources: [
              {
                title: "Single-tag blog post",
                summary: "Only one tag",
                url: "/blog/single-tag",
                slug: "single-tag",
                kind: "blog",
                publishedAt: "2026-06-01",
                tags: ["foundations"],
              },
            ],
          },
        ]}
        listLabel="Resources"
        tagSlug="foundations"
      />,
    );

    expect(html).toContain('href="/tags/foundations"');
  });
});

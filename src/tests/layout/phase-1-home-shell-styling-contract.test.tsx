import { describe, expect, test } from "bun:test";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HomeBrowseLink,
  HomeBrowseList,
} from "@/components/home/home-browse-link";
import { HomeBrushHeader } from "@/components/home/home-brush-header";
import { getPrimaryNavItems } from "@/components/layout/primary-nav";
import { TagResourceList } from "@/features/docs/components/TagResourceList";
import { SearchTrigger } from "@/features/docs/search/SearchTrigger";
import { TagsIndexList } from "@/features/docs/tags/TagsIndexList";
import type { TagResourceKindGroup } from "@/lib/content/tag-resources";
import type { TagIndexCategoryGroup } from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";

const sampleTagGroups: TagIndexCategoryGroup[] = [
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

const sampleTagResourceGroups: TagResourceKindGroup[] = [
  {
    kind: "module",
    kindLabel: "Module",
    resources: [
      {
        title: "Grouped-query attention",
        summary: "GQA module",
        url: "/docs/modules/grouped-query-attention",
        slug: "grouped-query-attention",
        kind: "module",
      },
    ],
  },
];

describe("Phase 1 home shell styling contracts", () => {
  test("primary nav, brush header, search trigger, and tag lists meet shared class contracts", async () => {
    const messages = await loadUiMessages();

    expect(getPrimaryNavItems(messages).map((item) => item.href)).toEqual([
      "/",
      "/docs/architecture",
      "/docs/glossary",
      "/tags",
    ]);
    expect(
      getPrimaryNavItems(messages).some((item) => item.href === "/search"),
    ).toBe(false);

    const brushHtml = renderToStaticMarkup(
      <HomeBrushHeader title="Model Atlas" subtitle="Reference" />,
    );
    expect(brushHtml).not.toContain("mb-8");

    const browseListHtml = renderToStaticMarkup(
      <HomeBrowseList ariaLabel="Browse">
        <HomeBrowseLink href="/tags" title="Tags" description="Browse by tag" />
      </HomeBrowseList>,
    );
    expect(browseListHtml).toContain("list-none");
    expect(browseListHtml).not.toContain("list-disc");

    const browseLinkHtml = renderToStaticMarkup(
      <HomeBrowseLink
        href="/docs/architecture"
        title="Architecture"
        description="System overview"
      />,
    );
    expect(browseLinkHtml).toContain("no-underline");
    expect(browseLinkHtml).toContain("hover:no-underline");
    expect(browseLinkHtml).toContain("focus-visible:ring-2");
    const withoutNoUnderline = browseLinkHtml.replaceAll("no-underline", "");
    expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);

    const SearchDialog: ComponentType<SharedProps> = () => null;
    const searchHtml = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <SearchTrigger messages={messages} />
      </RootProvider>,
    );
    expect(searchHtml).toContain('data-search=""');
    expect(searchHtml).toContain("group-hover:text-accent-foreground");
    expect(searchHtml).toContain("group-focus-visible:text-accent-foreground");

    const tagsIndexHtml = renderToStaticMarkup(
      <TagsIndexList groups={sampleTagGroups} listLabel="Tags" />,
    );
    expect(tagsIndexHtml).not.toContain("mt-8");
    expect(tagsIndexHtml).toContain("list-none");
    expect(tagsIndexHtml).not.toContain("list-disc");

    const tagResourceHtml = renderToStaticMarkup(
      <TagResourceList
        groups={sampleTagResourceGroups}
        listLabel="Resources"
      />,
    );
    expect(tagResourceHtml).not.toContain("mt-8");
    expect(tagResourceHtml).toContain("list-none");
    expect(tagResourceHtml).not.toContain("list-disc");
  });
});

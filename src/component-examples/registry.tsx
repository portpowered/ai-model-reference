import {
  SearchDialog,
  SearchDialogContent,
  SearchDialogList,
  type SearchItemType,
} from "fumadocs-ui/components/dialog/search";
import type { ReactNode } from "react";
import type {
  ComponentExampleContext,
  ComponentExampleDefinition,
  ComponentExampleName,
} from "@/component-examples/types";
import { Callout } from "@/features/docs/components/Callout";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { Section } from "@/features/docs/components/Section";
import { T } from "@/features/docs/components/T";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { SearchResultMetaDetails } from "@/features/docs/search/SearchResultMetaDetails";
import {
  SearchInlineResultItem,
  SearchResultListItem,
} from "@/features/docs/search/SearchResults";
import {
  SAME_CONCEPT_TYPE,
  SAME_VARIANT_GROUP,
  SHARED_TAGS,
} from "@/lib/content/related-docs";

function withPageMessages(
  context: ComponentExampleContext,
  ui: ReactNode,
  isDev = false,
) {
  return (
    <PageMessagesProvider messages={context.pageMessages} isDev={isDev}>
      {ui}
    </PageMessagesProvider>
  );
}

function renderSearchResultListItemExample(
  context: ComponentExampleContext,
  item: SearchItemType,
  query: string,
) {
  return (
    <SearchDialog
      open
      onOpenChange={() => {}}
      search={query}
      onSearchChange={() => {}}
      isLoading={false}
    >
      <SearchDialogContent>
        <SearchDialogList
          items={[item]}
          Item={({ item: listItem, onClick }) => (
            <SearchResultListItem
              item={listItem}
              query={query}
              metaByUrl={context.metaByUrl}
              messages={context.uiMessages}
              onClick={onClick}
            />
          )}
        />
      </SearchDialogContent>
    </SearchDialog>
  );
}

export const componentExamples: ComponentExampleDefinition[] = [
  {
    id: "callout-note",
    componentName: "Callout",
    variantLabel: "default (note)",
    description: "Module page note callout with resolved title and body keys.",
    render: (context) =>
      withPageMessages(
        context,
        <Callout type="note" titleKey="callouts.readerShortcut.title">
          <T k="callouts.readerShortcut.body" />
        </Callout>,
      ),
  },
  {
    id: "callout-warning",
    componentName: "Callout",
    variantLabel: "warning",
    description: "Warning variant using the same message keys.",
    render: (context) =>
      withPageMessages(
        context,
        <Callout type="warning" titleKey="callouts.readerShortcut.title">
          <T k="callouts.readerShortcut.body" />
        </Callout>,
      ),
  },
  {
    id: "section-default",
    componentName: "Section",
    variantLabel: "default",
    description: "Standard module section with resolved heading and body.",
    render: (context) =>
      withPageMessages(
        context,
        <Section id="what-it-is" titleKey="sections.whatItIs.title">
          <T k="sections.whatItIs.body" />
        </Section>,
      ),
  },
  {
    id: "section-missing-key",
    componentName: "Section",
    variantLabel: "missing message key (dev)",
    description: "Dev-only missing-key affordance for unresolved title keys.",
    render: (context) =>
      withPageMessages(
        context,
        <Section id="missing-example" titleKey="sections.doesNotExist.title">
          <T k="sections.whatItIs.body" />
        </Section>,
        true,
      ),
  },
  {
    id: "t-resolved",
    componentName: "T",
    variantLabel: "default (resolved key)",
    render: (context) =>
      withPageMessages(context, <T k="sections.whatItIs.body" />),
  },
  {
    id: "t-missing-key",
    componentName: "T",
    variantLabel: "missing message key (dev)",
    render: (context) =>
      withPageMessages(context, <T k="sections.doesNotExist.body" />, true),
  },
  {
    id: "tag-pill-list-registry",
    componentName: "TagPillList",
    variantLabel: "default (registry tags)",
    render: () => <TagPillList registryId="module.grouped-query-attention" />,
  },
  {
    id: "tag-pill-list-explicit",
    componentName: "TagPillList",
    variantLabel: "explicit tag slugs",
    render: () => (
      <TagPillList tags={["attention", "inference", "transformer"]} />
    ),
  },
  {
    id: "derived-related-docs-variant-group",
    componentName: "DerivedRelatedDocs",
    variantLabel: "default (same variant group)",
    render: () => (
      <DerivedRelatedDocs
        registryId="module.grouped-query-attention"
        groups={[SAME_VARIANT_GROUP]}
      />
    ),
  },
  {
    id: "derived-related-docs-shared-tags",
    componentName: "DerivedRelatedDocs",
    variantLabel: "shared tags group",
    render: () => (
      <DerivedRelatedDocs
        registryId="module.grouped-query-attention"
        groups={[SHARED_TAGS, SAME_CONCEPT_TYPE]}
      />
    ),
  },
  {
    id: "search-inline-result-with-meta",
    componentName: "SearchInlineResultItem",
    variantLabel: "default (page result with metadata)",
    render: (context) => (
      <SearchInlineResultItem
        item={{
          id: "page-gqa",
          type: "page",
          url: context.sampleModuleUrl,
          content: "Grouped-Query Attention",
        }}
        query="GQA"
        metaByUrl={context.metaByUrl}
        messages={context.uiMessages}
        onSelect={() => {}}
      />
    ),
  },
  {
    id: "search-inline-result-action",
    componentName: "SearchInlineResultItem",
    variantLabel: "action result (no metadata)",
    render: (context) => (
      <SearchInlineResultItem
        item={{
          id: "action-open-search",
          type: "action",
          node: "Open search page",
          onSelect: () => {},
        }}
        query=""
        metaByUrl={context.metaByUrl}
        messages={context.uiMessages}
        onSelect={() => {}}
      />
    ),
  },
  {
    id: "search-result-meta-details",
    componentName: "SearchResultMetaDetails",
    variantLabel: "default (module metadata panel)",
    render: (context) => {
      const meta = context.metaByUrl[context.sampleModuleUrl];
      if (!meta) {
        return null;
      }
      return (
        <SearchResultMetaDetails
          url={context.sampleModuleUrl}
          query="GQA"
          meta={meta}
          messages={context.uiMessages}
        />
      );
    },
  },
  {
    id: "search-result-meta-details-no-tags",
    componentName: "SearchResultMetaDetails",
    variantLabel: "metadata without tag chips",
    render: (context) => {
      const meta = context.metaByUrl[context.sampleModuleUrl];
      if (!meta) {
        return null;
      }
      return (
        <SearchResultMetaDetails
          url={context.sampleModuleUrl}
          query="GQA"
          meta={{ ...meta, tags: [] }}
          messages={context.uiMessages}
        />
      );
    },
  },
  {
    id: "search-result-list-item",
    componentName: "SearchResultListItem",
    variantLabel: "default (dialog row with metadata)",
    render: (context) =>
      renderSearchResultListItemExample(
        context,
        {
          id: "page-gqa",
          type: "page",
          url: context.sampleModuleUrl,
          content: "Grouped-Query Attention",
        },
        "GQA",
      ),
  },
  {
    id: "search-result-list-item-no-meta",
    componentName: "SearchResultListItem",
    variantLabel: "page row without metadata",
    render: (context) =>
      renderSearchResultListItemExample(
        context,
        {
          id: "page-token",
          type: "page",
          url: "/docs/glossary/unknown-example",
          content: "Unknown glossary entry",
        },
        "token",
      ),
  },
];

export function groupExamplesByComponent(): Map<
  ComponentExampleName,
  ComponentExampleDefinition[]
> {
  const grouped = new Map<ComponentExampleName, ComponentExampleDefinition[]>();
  for (const example of componentExamples) {
    const existing = grouped.get(example.componentName) ?? [];
    existing.push(example);
    grouped.set(example.componentName, existing);
  }
  return grouped;
}

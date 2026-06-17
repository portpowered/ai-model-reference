"use client";

import {
  SearchDialog,
  SearchDialogContent,
  SearchDialogList,
  type SearchItemType,
} from "fumadocs-ui/components/dialog/search";
import type { ComponentExampleContext } from "@/component-examples/types";
import {
  SearchInlineResultItem,
  SearchResultListItem,
} from "@/features/docs/search/SearchResults";

type SearchExampleProps = {
  context: ComponentExampleContext;
};

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

export function SearchInlineResultWithMetaExample({
  context,
}: SearchExampleProps) {
  return (
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
  );
}

export function SearchInlineResultActionExample({
  context,
}: SearchExampleProps) {
  return (
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
  );
}

export function SearchResultListItemExample({ context }: SearchExampleProps) {
  return renderSearchResultListItemExample(
    context,
    {
      id: "page-gqa",
      type: "page",
      url: context.sampleModuleUrl,
      content: "Grouped-Query Attention",
    },
    "GQA",
  );
}

export function SearchResultListItemNoMetaExample({
  context,
}: SearchExampleProps) {
  return renderSearchResultListItemExample(
    context,
    {
      id: "page-token",
      type: "page",
      url: "/docs/glossary/unknown-example",
      content: "Unknown glossary entry",
    },
    "token",
  );
}

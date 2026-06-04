import { type RenderOptions, render } from "@testing-library/react";
import {
  SearchDialog as FumaSearchDialog,
  SearchDialogContent,
  SearchDialogList,
  type SearchItemType,
} from "fumadocs-ui/components/dialog/search";
import type { ReactElement, ReactNode } from "react";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { SearchResultListItem } from "@/features/docs/search/SearchResults";
import type { SearchResultMetaRecord } from "@/features/docs/search/search-result-meta-client";
import {
  groupedQueryAttentionPageDir,
  loadPageMessages,
} from "@/lib/content/page-messages-load";
import type { PageMessages } from "@/lib/content/schemas";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  type AppTestContext,
  loadAppTestContext,
  renderWithAppProviders,
} from "@/tests/a11y/render";

let cachedGqaMessages: PageMessages | null = null;

export async function loadGqaPageMessages(): Promise<PageMessages> {
  if (cachedGqaMessages) {
    return cachedGqaMessages;
  }
  cachedGqaMessages = await loadPageMessages(
    groupedQueryAttentionPageDir,
    "en",
  );
  return cachedGqaMessages;
}

type RenderWithPageMessagesOptions = Omit<RenderOptions, "wrapper"> & {
  messages: PageMessages;
  isDev?: boolean;
};

export function renderWithPageMessages(
  ui: ReactElement,
  { messages, isDev = false, ...options }: RenderWithPageMessagesOptions,
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PageMessagesProvider messages={messages} isDev={isDev}>
        {children}
      </PageMessagesProvider>
    );
  }

  return render(ui, { ...options, wrapper: Wrapper });
}

type RenderSearchResultListItemOptions = {
  item: SearchItemType;
  query: string;
  metaByUrl?: SearchResultMetaRecord;
  messages?: UiMessages;
  violation?: ReactNode;
  context?: AppTestContext;
};

export async function renderSearchResultListItem({
  item,
  query,
  metaByUrl,
  messages,
  violation,
  context: contextOverride,
}: RenderSearchResultListItemOptions) {
  const context = contextOverride ?? (await loadAppTestContext());
  const resolvedMeta = metaByUrl ?? context.metaByUrl;
  const resolvedMessages = messages ?? context.messages;

  return renderWithAppProviders(
    <FumaSearchDialog
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
            <>
              <SearchResultListItem
                item={listItem}
                query={query}
                metaByUrl={resolvedMeta}
                messages={resolvedMessages}
                onClick={onClick}
              />
              {violation}
            </>
          )}
        />
      </SearchDialogContent>
    </FumaSearchDialog>,
    { context },
  );
}

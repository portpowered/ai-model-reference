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
import messageFixture from "@/lib/content/__fixtures__/page-messages.json";
import {
  groupedQueryAttentionPageDir,
  loadPageMessages,
} from "@/lib/content/page-messages-load";
import { type PageMessages, pageMessagesSchema } from "@/lib/content/schemas";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import type { SiteLocale } from "@/lib/i18n/locale-routing";
import {
  type AppTestContext,
  loadAppTestContext,
  renderWithAppProviders,
} from "@/tests/a11y/render";

let cachedGqaMessages: PageMessages | null = null;
let cachedCalloutExampleMessages: PageMessages | null = null;

export function loadCalloutExamplePageMessages(): PageMessages {
  if (cachedCalloutExampleMessages) {
    return cachedCalloutExampleMessages;
  }
  cachedCalloutExampleMessages = pageMessagesSchema.parse(messageFixture);
  return cachedCalloutExampleMessages;
}

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
  locale?: SiteLocale;
  violation?: ReactNode;
  context?: AppTestContext;
};

export async function renderSearchResultListItem({
  item,
  query,
  metaByUrl,
  messages,
  locale,
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
                locale={locale}
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

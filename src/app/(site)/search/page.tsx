import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { SearchPagePanelContent } from "@/features/docs/search/SearchPagePanel";
import {
  EMPTY_SEARCH_PAGE_HANDOFF,
  resolveSearchPageHandoff,
} from "@/features/docs/search/search-page-query";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({
  searchParams,
}: SearchPageProps = {}) {
  const messages = await loadUiMessages();
  const metaByUrl = searchResultMetaMapToRecord(
    await loadSearchResultMetaMap(),
  );
  const { searchEntry } = messages;
  const handoff =
    process.env.NEXT_STATIC_EXPORT === "1"
      ? EMPTY_SEARCH_PAGE_HANDOFF
      : resolveSearchPageHandoff(await searchParams);

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{searchEntry.title}</DocsTitle>
      <DocsDescription>{searchEntry.description}</DocsDescription>
      <DocsBody>
        <p className="text-sm text-muted-foreground">
          {searchEntry.canonicalNote}
        </p>
        <SearchPagePanelContent
          messages={messages}
          metaByUrl={metaByUrl}
          handoff={handoff}
        />
      </DocsBody>
    </DocsPage>
  );
}

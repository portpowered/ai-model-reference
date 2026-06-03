import { Suspense } from "react";
import { SearchPagePanel } from "@/features/docs/search/SearchPagePanel";
import { loadUiMessages, type UiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";

function SearchPagePanelFallback({ messages }: { messages: UiMessages }) {
  const { searchEntry, search: searchCopy } = messages;

  return (
    <div
      className="mt-6 flex w-full max-w-xl items-center gap-3 rounded-lg border border-input bg-card px-4 py-3 text-sm text-muted-foreground"
      aria-hidden
    >
      <span>{searchCopy.placeholder}</span>
      <span className="sr-only">{searchEntry.title}</span>
    </div>
  );
}

export default async function SearchPage() {
  const messages = await loadUiMessages();
  const metaByUrl = searchResultMetaMapToRecord(
    await loadSearchResultMetaMap(),
  );
  const { searchEntry } = messages;

  return (
    <article className="max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        {searchEntry.title}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        {searchEntry.description}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        {searchEntry.canonicalNote}
      </p>
      <Suspense fallback={<SearchPagePanelFallback messages={messages} />}>
        <SearchPagePanel messages={messages} metaByUrl={metaByUrl} />
      </Suspense>
    </article>
  );
}

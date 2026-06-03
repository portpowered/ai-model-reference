import { Suspense } from "react";
import { SearchEntryHandoff } from "@/features/docs/search/SearchEntryHandoff";
import { loadUiMessages } from "@/lib/content/ui-messages";

function SearchEntryHandoffFallback() {
  const messages = loadUiMessages();
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

export default function SearchEntryPage() {
  const messages = loadUiMessages();
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
      <Suspense fallback={<SearchEntryHandoffFallback />}>
        <SearchEntryHandoff messages={messages} />
      </Suspense>
    </article>
  );
}

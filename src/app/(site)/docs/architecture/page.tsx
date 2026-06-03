import { ArchitectureEmptyState } from "@/features/docs/architecture/ArchitectureEmptyState";
import { ArchitectureIndexList } from "@/features/docs/architecture/ArchitectureIndexList";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default async function ArchitectureIndexPage() {
  const messages = await loadUiMessages();
  const entries = await loadPublishedArchitectureEntries();
  const { architectureIndex } = messages;

  return (
    <article className="max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        {architectureIndex.title}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        {architectureIndex.description}
      </p>
      {entries.length === 0 ? (
        <ArchitectureEmptyState messages={messages} />
      ) : (
        <ArchitectureIndexList
          entries={entries}
          listLabel={architectureIndex.listLabel}
        />
      )}
    </article>
  );
}

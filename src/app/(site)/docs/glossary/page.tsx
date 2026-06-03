import { GlossaryEmptyState } from "@/features/docs/glossary/GlossaryEmptyState";
import { GlossaryIndexList } from "@/features/docs/glossary/GlossaryIndexList";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default async function GlossaryIndexPage() {
  const messages = await loadUiMessages();
  const entries = await loadPublishedGlossaryEntries();
  const { glossaryIndex } = messages;

  return (
    <article className="max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        {glossaryIndex.title}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        {glossaryIndex.description}
      </p>
      {entries.length === 0 ? (
        <GlossaryEmptyState messages={messages} />
      ) : (
        <GlossaryIndexList
          entries={entries}
          listLabel={glossaryIndex.listLabel}
        />
      )}
    </article>
  );
}

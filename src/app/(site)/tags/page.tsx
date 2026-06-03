import { TagsIndexList } from "@/features/docs/tags/TagsIndexList";
import { loadPublishedTagIndexGroups } from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default function TagsIndexPage() {
  const messages = loadUiMessages();
  const groups = loadPublishedTagIndexGroups(messages);
  const { tagsIndex } = messages;

  return (
    <article className="max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        {tagsIndex.title}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        {tagsIndex.description}
      </p>
      <TagsIndexList groups={groups} listLabel={tagsIndex.listLabel} />
    </article>
  );
}

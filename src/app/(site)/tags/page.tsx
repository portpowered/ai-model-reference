import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { TagsIndexList } from "@/features/docs/tags/TagsIndexList";
import { loadPublishedTagIndexGroups } from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default async function TagsIndexPage() {
  const messages = await loadUiMessages();
  const groups = await loadPublishedTagIndexGroups(messages);
  const { tagsIndex } = messages;

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{tagsIndex.title}</DocsTitle>
      <DocsDescription>{tagsIndex.description}</DocsDescription>
      <DocsBody>
        <TagsIndexList groups={groups} listLabel={tagsIndex.listLabel} />
      </DocsBody>
    </DocsPage>
  );
}

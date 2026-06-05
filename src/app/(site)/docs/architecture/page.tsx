import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { DocsIndexEmptyState } from "@/features/docs/components/DocsIndexEmptyState";
import { DocsIndexEntryList } from "@/features/docs/components/DocsIndexEntryList";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default async function ArchitectureIndexPage() {
  const messages = await loadUiMessages();
  const entries = await loadPublishedArchitectureEntries();
  const { architectureIndex } = messages;

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{architectureIndex.title}</DocsTitle>
      <DocsDescription>{architectureIndex.description}</DocsDescription>
      <DocsBody>
        {entries.length === 0 ? (
          <DocsIndexEmptyState
            title={architectureIndex.emptyTitle}
            description={architectureIndex.emptyDescription}
            homeLinkLabel={architectureIndex.emptyHomeLink}
            messages={messages}
          />
        ) : (
          <DocsIndexEntryList
            entries={entries}
            listLabel={architectureIndex.listLabel}
          />
        )}
      </DocsBody>
    </DocsPage>
  );
}

import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { ArchitectureIndexList } from "@/features/docs/architecture/ArchitectureIndexList";
import { DocsIndexEmptyState } from "@/features/docs/components/DocsIndexEmptyState";
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
          <ArchitectureIndexList
            entries={entries}
            listLabel={architectureIndex.listLabel}
          />
        )}
      </DocsBody>
    </DocsPage>
  );
}

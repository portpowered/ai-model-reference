import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { DocsIndexEmptyState } from "@/features/docs/components/DocsIndexEmptyState";
import { GlossaryIndexList } from "@/features/docs/glossary/GlossaryIndexList";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default async function GlossaryIndexPage() {
  const messages = await loadUiMessages();
  const entries = await loadPublishedGlossaryEntries();
  const { glossaryIndex } = messages;

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{glossaryIndex.title}</DocsTitle>
      <DocsDescription>{glossaryIndex.description}</DocsDescription>
      <DocsBody>
        {entries.length === 0 ? (
          <DocsIndexEmptyState
            title={glossaryIndex.emptyTitle}
            description={glossaryIndex.emptyDescription}
            homeLinkLabel={glossaryIndex.emptyHomeLink}
            messages={messages}
          />
        ) : (
          <GlossaryIndexList
            entries={entries}
            listLabel={glossaryIndex.listLabel}
          />
        )}
      </DocsBody>
    </DocsPage>
  );
}

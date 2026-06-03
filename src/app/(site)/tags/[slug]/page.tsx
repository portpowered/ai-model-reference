import { TagResourceList } from "@/features/docs/components/TagResourceList";
import { TagLandingEmptyState } from "@/features/docs/tags/TagLandingEmptyState";
import { TagSearchHandoff } from "@/features/docs/tags/TagSearchHandoff";
import {
  loadTagLandingContext,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import { loadPublishedTagIndexEntries } from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { notFound } from "next/navigation";

type TagLandingPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  const messages = loadUiMessages();
  return loadPublishedTagIndexEntries(messages, "en").map((entry) => ({
    slug: entry.slug,
  }));
}

export default async function TagLandingPage({ params }: TagLandingPageProps) {
  const { slug } = await params;
  const messages = loadUiMessages();
  const context = loadTagLandingContext(slug, messages, "en");

  if (!context) {
    notFound();
  }

  const groups = loadTagResourceGroups(slug, messages, "en");
  const { tagLanding } = messages;
  const searchQuery = context.slug;

  return (
    <article className="max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        {context.title}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        {context.summary}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5">
          {context.categoryLabel}
        </span>
      </p>
      <div className="mt-6">
        <TagSearchHandoff
          messages={messages}
          tagSlug={slug}
          searchQuery={searchQuery}
          label={tagLanding.searchHandoff}
        />
      </div>
      {groups.length === 0 ? (
        <TagLandingEmptyState
          messages={messages}
          tagSlug={slug}
          searchQuery={searchQuery}
        />
      ) : (
        <TagResourceList groups={groups} listLabel={tagLanding.listLabel} />
      )}
    </article>
  );
}

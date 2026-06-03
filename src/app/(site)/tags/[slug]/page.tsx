import Link from "next/link";
import { notFound } from "next/navigation";
import { TagResourceList } from "@/features/docs/components/TagResourceList";
import { TagLandingEmptyState } from "@/features/docs/tags/TagLandingEmptyState";
import { TagSearchHandoff } from "@/features/docs/tags/TagSearchHandoff";
import {
  loadTagLandingContext,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import { loadPublishedTagIndexEntries } from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";

type TagLandingPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const messages = await loadUiMessages();
  const entries = await loadPublishedTagIndexEntries(messages, "en");
  return entries.map((entry) => ({
    slug: entry.slug,
  }));
}

export default async function TagLandingPage({ params }: TagLandingPageProps) {
  const { slug } = await params;
  const messages = await loadUiMessages();
  const context = await loadTagLandingContext(slug, messages, "en");

  if (!context) {
    notFound();
  }

  const groups = await loadTagResourceGroups(slug, messages, "en");
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
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <TagSearchHandoff
          messages={messages}
          tagSlug={slug}
          searchQuery={searchQuery}
          label={tagLanding.searchHandoff}
        />
        <Link
          href={`/search?tag=${encodeURIComponent(slug)}`}
          className="inline-flex items-center rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-ring hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tagLanding.searchEntryLink}
        </Link>
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

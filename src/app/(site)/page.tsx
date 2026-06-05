import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import Link from "next/link";
import { HomeBrowseLink } from "@/components/home/home-browse-link";
import { HomeBrushHeader } from "@/components/home/home-brush-header";
import { HomeSearchEntry } from "@/features/docs/search/HomeSearchEntry";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default async function HomePage() {
  const messages = await loadUiMessages();
  const { home } = messages;

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsBody>
        <article className="max-w-3xl">
          <HomeBrushHeader title={home.title} subtitle={home.subtitle} />
          <p className="text-base leading-relaxed text-muted-foreground">
            {home.intro}
          </p>

          <section
            id="search"
            className="mt-10 scroll-mt-6"
            aria-labelledby="home-search-heading"
          >
            <h2
              id="home-search-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {home.searchSectionTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {home.searchSectionDescription}
            </p>
            <div className="mt-4">
              <HomeSearchEntry messages={messages} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <Link
                href="/search"
                className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {home.searchPageLinkTitle}
              </Link>
              {" — "}
              {home.searchPageLinkDescription}
            </p>
          </section>

          <section
            id="browse"
            className="mt-10 scroll-mt-6"
            aria-labelledby="home-browse-heading"
          >
            <h2
              id="home-browse-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {home.browseSectionTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {home.browseSectionDescription}
            </p>
            <ul
              className="mt-4 flex flex-col gap-3"
              aria-label={home.browseSectionTitle}
            >
              <HomeBrowseLink
                href="/docs/architecture"
                title={home.architectureLinkTitle}
                description={home.architectureLinkDescription}
              />
              <HomeBrowseLink
                href="/docs/glossary"
                title={home.glossaryLinkTitle}
                description={home.glossaryLinkDescription}
              />
              <HomeBrowseLink
                href="/docs/glossary/token"
                title={home.tokenLinkTitle}
                description={home.tokenLinkDescription}
              />
              <HomeBrowseLink
                href="/tags"
                title={home.tagsLinkTitle}
                description={home.tagsLinkDescription}
              />
              <HomeBrowseLink
                href="/docs/modules/grouped-query-attention"
                title={home.docsLinkTitle}
                description={home.docsLinkDescription}
              />
            </ul>
          </section>
        </article>
      </DocsBody>
    </DocsPage>
  );
}

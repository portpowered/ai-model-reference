import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { notFound } from "next/navigation";
import { DocsAutoLinkedDescription } from "@/features/docs/components/DocsAutoLinkedDescription";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  loadLocalDocsPage,
  parseLocalDocsPageRef,
} from "@/lib/content/local-docs-page";
import { isDocsPageShippedForLocale } from "@/lib/content/pages";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { source } from "@/lib/source";
import { getMDXComponents } from "../../../mdx-components";

function buildDocsPageAlternates(docsSlug: string) {
  const alternates = localizedRouteAlternates({
    surface: "docs-page",
    slug: docsSlug,
  });
  const languages = alternates.languages ?? {};

  return {
    ...alternates,
    languages: Object.fromEntries(
      Object.entries(languages).filter(([locale]) =>
        isDocsPageShippedForLocale(docsSlug, locale as SiteLocale),
      ),
    ),
  };
}

async function renderLocalDocsPage(
  slug: string[] | undefined,
  locale: SiteLocale,
) {
  const localRef = parseLocalDocsPageRef(slug);
  if (!localRef) {
    return null;
  }

  const page = source.getPage(slug);
  if (!page) {
    return null;
  }

  const loadedPage = await loadLocalDocsPage(localRef, locale);
  const description =
    localRef.section === "glossary" ? (
      <DocsAutoLinkedDescription text={loadedPage.messages.description} />
    ) : (
      loadedPage.messages.description
    );

  return (
    <DocsPage toc={loadedPage.toc}>
      <ModulePageProviders
        messages={loadedPage.messages}
        assets={loadedPage.assets}
        locale={locale}
      >
        <DocsTitle>{loadedPage.messages.title}</DocsTitle>
        <DocsDescription>{description}</DocsDescription>
        <DocsBody>
          <article data-registry-id={loadedPage.frontmatter.registryId}>
            {loadedPage.content}
          </article>
        </DocsBody>
      </ModulePageProviders>
    </DocsPage>
  );
}

export async function renderDocsSlugPage(
  slug: string[] | undefined,
  locale: SiteLocale = defaultLocale,
) {
  const docsSlug = slug?.join("/");
  if (docsSlug && !isDocsPageShippedForLocale(docsSlug, locale)) {
    notFound();
  }

  const localPage = await renderLocalDocsPage(slug, locale);
  if (localPage) {
    return localPage;
  }

  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const MDXContent = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function buildDocsPageMetadata(
  slug: string[] | undefined,
  locale: SiteLocale = defaultLocale,
) {
  const docsSlug = slug?.join("/");
  if (docsSlug && !isDocsPageShippedForLocale(docsSlug, locale)) {
    notFound();
  }

  const localRef = parseLocalDocsPageRef(slug);

  if (localRef) {
    const page = source.getPage(slug);
    if (page && docsSlug) {
      const loadedPage = await loadLocalDocsPage(localRef, locale);
      return {
        title: loadedPage.messages.title,
        description: loadedPage.messages.description,
        alternates: buildDocsPageAlternates(docsSlug),
      };
    }
  }

  const page = source.getPage(slug);

  if (!page) {
    return {
      title: "Page not found",
    };
  }

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: docsSlug ? buildDocsPageAlternates(docsSlug) : undefined,
  };
}

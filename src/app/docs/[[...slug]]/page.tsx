import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsAutoLinkedDescription } from "@/features/docs/components/DocsAutoLinkedDescription";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  loadLocalDocsPage,
  parseLocalDocsPageRef,
} from "@/lib/content/local-docs-page";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { source } from "@/lib/source";
import { getMDXComponents } from "../../../../mdx-components";

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

async function renderLocalDocsPage(slug: string[] | undefined) {
  const localRef = parseLocalDocsPageRef(slug);
  if (!localRef) {
    return null;
  }

  const page = source.getPage(slug);
  if (!page) {
    return null;
  }

  const loadedPage = await loadLocalDocsPage(localRef);
  const description =
    localRef.section === "glossary" ? (
      <DocsAutoLinkedDescription text={loadedPage.messages.description} />
    ) : (
      loadedPage.messages.description
    );

  return (
    <DocsPage toc={loadedPage.toc}>
      <DocsTitle>{loadedPage.messages.title}</DocsTitle>
      <DocsDescription>{description}</DocsDescription>
      <DocsBody>
        <ModulePageProviders
          messages={loadedPage.messages}
          assets={loadedPage.assets}
        >
          <article data-registry-id={loadedPage.frontmatter.registryId}>
            {loadedPage.content}
          </article>
        </ModulePageProviders>
      </DocsBody>
    </DocsPage>
  );
}

export default async function DocsSlugPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const localPage = await renderLocalDocsPage(slug);
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

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const docsSlug = slug?.join("/");
  const localRef = parseLocalDocsPageRef(slug);

  if (localRef) {
    const page = source.getPage(slug);
    if (page && docsSlug) {
      const loadedPage = await loadLocalDocsPage(localRef);
      return {
        title: loadedPage.messages.title,
        description: loadedPage.messages.description,
        alternates: localizedRouteAlternates({
          surface: "docs-page",
          slug: docsSlug,
        }),
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
    alternates: docsSlug
      ? localizedRouteAlternates({
          surface: "docs-page",
          slug: docsSlug,
        })
      : undefined,
  };
}

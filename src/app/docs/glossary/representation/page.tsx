import type { Metadata } from "next";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadGlossaryPage("representation");

  return {
    title: page.messages.title,
    description: page.messages.description,
  };
}

export default async function RepresentationGlossaryPage() {
  const page = await loadGlossaryPage("representation");

  return (
    <ModulePageProviders messages={page.messages} assets={page.assets}>
      <article data-registry-id={page.frontmatter.registryId}>
        {page.content}
      </article>
    </ModulePageProviders>
  );
}

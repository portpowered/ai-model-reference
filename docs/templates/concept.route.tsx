import type { Metadata } from "next";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadConceptPage("example-concept");

  return {
    title: page.messages.title,
    description: page.messages.description,
  };
}

export default async function ExampleConceptPage() {
  const page = await loadConceptPage("example-concept");

  return (
    <ModulePageProviders messages={page.messages} assets={page.assets}>
      <article data-registry-id={page.frontmatter.registryId}>
        {page.content}
      </article>
    </ModulePageProviders>
  );
}

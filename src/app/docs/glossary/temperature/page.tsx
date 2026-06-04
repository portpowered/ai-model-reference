import type { Metadata } from "next";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadGlossaryPage("temperature");

  return {
    title: page.messages.title,
    description: page.messages.description,
  };
}

export default async function TemperatureGlossaryPage() {
  const page = await loadGlossaryPage("temperature");

  return (
    <ModulePageProviders messages={page.messages} assets={page.assets}>
      <article data-registry-id={page.frontmatter.registryId}>
        {page.content}
      </article>
    </ModulePageProviders>
  );
}

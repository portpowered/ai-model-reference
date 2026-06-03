import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";

export default async function TokenGlossaryPage() {
  const page = await loadGlossaryPage("token");

  return (
    <ModulePageProviders messages={page.messages} assets={page.assets}>
      <article data-registry-id={page.frontmatter.registryId}>
        {page.content}
      </article>
    </ModulePageProviders>
  );
}

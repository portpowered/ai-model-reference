import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModulePage } from "@/lib/content/module-page";

export default async function GroupedQueryAttentionPage() {
  const page = await loadModulePage("grouped-query-attention");

  return (
    <ModulePageProviders messages={page.messages} assets={page.assets}>
      <article data-registry-id={page.frontmatter.registryId}>
        {page.content}
      </article>
    </ModulePageProviders>
  );
}

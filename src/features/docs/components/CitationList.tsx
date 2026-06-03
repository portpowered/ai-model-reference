import { resolveCitations } from "@/lib/content/citations";
import { getModuleById } from "@/lib/content/registry";

type CitationListProps = {} & (
  | { registryId: string; citationIds?: never }
  | { citationIds: string[]; registryId?: never }
);

function resolveCitationIds(props: CitationListProps): string[] {
  if ("citationIds" in props && props.citationIds !== undefined) {
    return props.citationIds;
  }
  if ("registryId" in props && props.registryId !== undefined) {
    return getModuleById(props.registryId)?.citationIds ?? [];
  }
  return [];
}

export function CitationList(props: CitationListProps) {
  const citations = resolveCitations(resolveCitationIds(props));
  if (citations.length === 0) {
    return null;
  }

  return (
    <ol
      className="my-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground"
      aria-label="References"
      data-testid="citation-list"
    >
      {citations.map((citation) => (
        <li key={citation.id}>
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {citation.mla}
          </a>
        </li>
      ))}
    </ol>
  );
}

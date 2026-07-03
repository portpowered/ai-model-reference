import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";

type BlogRelatedDocsProps = {
  relatedDocIds: string[];
};

export function BlogRelatedDocs({ relatedDocIds }: BlogRelatedDocsProps) {
  return (
    <RegistryLinkList
      registryIds={relatedDocIds}
      emptyLabel="No related reference pages are linked for this post."
    />
  );
}

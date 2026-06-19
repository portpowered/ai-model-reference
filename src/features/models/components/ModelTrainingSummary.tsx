import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import { getModelById } from "@/lib/content/registry-runtime";

export function ModelTrainingSummary({ registryId }: { registryId: string }) {
  const record = getModelById(registryId);
  if (!record) {
    return null;
  }

  const hasTrainingRegimes = record.trainingRegimeIds.length > 0;
  const hasLinkedPapers = record.paperIds.length > 0;

  if (!hasTrainingRegimes && !hasLinkedPapers) {
    return null;
  }

  return (
    <div className="my-4 space-y-4">
      {hasTrainingRegimes ? (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Training regimes
          </h3>
          <RegistryLinkList
            registryIds={record.trainingRegimeIds}
            emptyLabel=""
          />
        </section>
      ) : null}
      {hasLinkedPapers ? (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Linked papers
          </h3>
          <RegistryLinkList registryIds={record.paperIds} emptyLabel="" />
        </section>
      ) : null}
    </div>
  );
}

import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import { getModelById } from "@/lib/content/registry-runtime";

export function ModelTrainingSummary({ registryId }: { registryId: string }) {
  const record = getModelById(registryId);
  if (!record) {
    return null;
  }

  return (
    <div className="my-4 space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Training regimes
        </h3>
        <RegistryLinkList
          registryIds={record.trainingRegimeIds}
          emptyLabel="No training regimes listed yet."
        />
      </section>
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Linked papers
        </h3>
        <RegistryLinkList
          registryIds={record.paperIds}
          emptyLabel="No linked paper pages listed yet."
        />
      </section>
    </div>
  );
}

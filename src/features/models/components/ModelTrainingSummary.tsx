import { getModelById } from "@/lib/content/registry-runtime";

function formatLabel(value: string): string {
  return value
    .replace(/^[^.]+\./, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ResourceList({
  ids,
  emptyLabel,
  testId,
}: {
  ids: string[];
  emptyLabel: string;
  testId: string;
}) {
  if (ids.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid={`${testId}-empty`}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-sm text-foreground" data-testid={testId}>
      {ids.map((id) => (
        <li key={id}>{formatLabel(id)}</li>
      ))}
    </ul>
  );
}

export function ModelTrainingSummary({ registryId }: { registryId: string }) {
  const record = getModelById(registryId);
  if (!record) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4" data-testid="model-training-summary">
      <section aria-label="Training regimes" className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          Training regimes
        </h3>
        <ResourceList
          ids={record.trainingRegimeIds}
          emptyLabel="Structured training-regime details are not available yet."
          testId="model-training-regimes"
        />
      </section>
      <section aria-label="Datasets" className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Datasets</h3>
        <ResourceList
          ids={record.datasetIds}
          emptyLabel="Structured dataset details are not available yet."
          testId="model-datasets"
        />
      </section>
      <section aria-label="Papers" className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Papers</h3>
        <ResourceList
          ids={record.paperIds}
          emptyLabel="Structured paper links are not available yet."
          testId="model-papers"
        />
      </section>
    </div>
  );
}

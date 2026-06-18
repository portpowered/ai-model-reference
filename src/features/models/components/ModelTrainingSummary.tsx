import { getModelById } from "@/lib/content/registry-runtime";

function SummaryList({
  items,
  emptyLabel,
}: {
  items: string[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="text-sm text-foreground">
          {item}
        </li>
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
    <div className="my-4 space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Training regimes
        </h3>
        <SummaryList
          items={record.trainingRegimeIds}
          emptyLabel="No training regimes listed yet."
        />
      </section>
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Linked papers
        </h3>
        <SummaryList
          items={record.paperIds}
          emptyLabel="No linked paper pages listed yet."
        />
      </section>
    </div>
  );
}

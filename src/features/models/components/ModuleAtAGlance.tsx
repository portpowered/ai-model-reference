import { getModuleById } from "@/lib/content/registry-runtime";

function formatToken(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function BulletList({
  items,
  formatItem = (item) => item,
}: {
  items: string[];
  formatItem?: (item: string) => string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None listed yet.</p>;
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {items.map((item) => (
        <li key={item}>{formatItem(item)}</li>
      ))}
    </ul>
  );
}

export function ModuleAtAGlance({ registryId }: { registryId: string }) {
  const record = getModuleById(registryId);
  if (!record) {
    return null;
  }

  return (
    <section
      className="my-6 rounded-lg border border-border bg-card p-4"
      data-registry-id={registryId}
      aria-label="At a glance"
    >
      <h2 className="mb-4 text-base font-semibold text-foreground">
        At a glance
      </h2>
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Optimizes
          </h3>
          <BulletList items={record.optimizes} formatItem={formatToken} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Practical benefits
          </h3>
          <BulletList items={record.practicalBenefits} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Example models
          </h3>
          <BulletList items={record.exampleModelIds} />
        </div>
      </div>
    </section>
  );
}

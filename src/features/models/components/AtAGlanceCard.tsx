import type { ReactNode } from "react";

export function AtAGlanceCard({
  children,
  registryId,
}: {
  children: ReactNode;
  registryId: string;
}) {
  return (
    <section
      className="my-6 rounded-lg border border-border bg-card p-4"
      data-registry-id={registryId}
      aria-label="At a glance"
    >
      <h2 className="mb-4 text-base font-semibold text-foreground">
        At a glance
      </h2>
      {children}
    </section>
  );
}

export function AtAGlanceDefinitionRow({
  label,
  value,
}: {
  label: string;
  value?: ReactNode;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function AtAGlanceListSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";

export type RegistryDeepLinkGroup = {
  id: string;
  title: string;
  registryIds: string[];
  emptyLabel: string;
  defaultOpen?: boolean;
};

export function RegistryDeepLinkList({
  groups,
}: {
  groups: RegistryDeepLinkGroup[];
}) {
  const visibleGroups = groups.filter((group) => group.registryIds.length > 0);
  if (visibleGroups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No associated records listed yet.
      </p>
    );
  }

  return (
    <div className="my-4 space-y-3">
      {visibleGroups.map((group) => (
        <DeepLinkGroupSection key={group.id} group={group} />
      ))}
    </div>
  );
}

function DeepLinkGroupSection({ group }: { group: RegistryDeepLinkGroup }) {
  const [open, setOpen] = useState(group.defaultOpen ?? false);

  return (
    <section className="rounded-lg border border-border bg-card/70">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-foreground">
          {group.title}
        </span>
        <span className="text-xs text-muted-foreground">
          {group.registryIds.length} linked
        </span>
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-3">
          <RegistryLinkList
            registryIds={group.registryIds}
            emptyLabel={group.emptyLabel}
          />
        </div>
      ) : null}
    </section>
  );
}

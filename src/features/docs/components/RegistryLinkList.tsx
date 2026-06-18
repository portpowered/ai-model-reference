import Link from "next/link";
import {
  registryDisplayTitle,
  registryRecordHref,
} from "@/lib/content/registry-linking";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";

type RegistryLinkListProps = {
  registryIds: string[];
  emptyLabel: string;
};

export function RegistryLinkList({
  registryIds,
  emptyLabel,
}: RegistryLinkListProps) {
  if (registryIds.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {registryIds.map((registryId) => {
        const record = getRegistryRecordById(registryId);
        const title = record ? registryDisplayTitle(record) : registryId;
        const href = record ? registryRecordHref(record) : undefined;

        return (
          <li key={registryId} className="text-sm text-foreground">
            {href ? (
              <Link
                href={href}
                className="underline decoration-border underline-offset-4 transition-colors hover:text-primary"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </li>
        );
      })}
    </ul>
  );
}

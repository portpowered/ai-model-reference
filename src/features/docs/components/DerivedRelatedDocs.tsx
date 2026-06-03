import Link from "next/link";
import {
  getModuleById,
  listModuleRecords,
} from "@/lib/content/registry-runtime";
import { deriveRelatedDocGroups } from "@/lib/content/related-docs";

type DerivedRelatedDocsProps = {
  registryId: string;
  groups: string[];
};

export function DerivedRelatedDocs({
  registryId,
  groups,
}: DerivedRelatedDocsProps) {
  const source = getModuleById(registryId);
  if (!source) {
    return null;
  }

  const derivedGroups = deriveRelatedDocGroups(
    source,
    listModuleRecords(),
    groups,
  );
  if (derivedGroups.length === 0) {
    return null;
  }

  return (
    <div className="my-4 space-y-6" data-testid="derived-related-docs">
      {derivedGroups.map((group) => (
        <section
          key={group.id}
          aria-label={group.reasonLabel}
          data-derived-group={group.id}
        >
          <ul className="space-y-3">
            {group.items.map((item) => (
              <li
                key={item.registryId}
                className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <Link
                  href={item.href}
                  className="text-sm text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {item.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {item.reasonLabel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

import Link from "next/link";
import { modulePageHref } from "@/lib/content/content-hrefs";
import {
  getModelById,
  getRegistryRecordById,
} from "@/lib/content/registry-runtime";

function formatTitle(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ModelModuleList({ registryId }: { registryId: string }) {
  const record = getModelById(registryId);
  if (!record || record.moduleIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No modules listed yet.</p>
    );
  }

  return (
    <ul className="my-4 space-y-2">
      {record.moduleIds.map((moduleId) => {
        const moduleRecord = getRegistryRecordById(moduleId);
        const label =
          moduleRecord?.aliases[0] ??
          (moduleRecord ? formatTitle(moduleRecord.slug) : moduleId);
        const href =
          moduleRecord?.kind === "module"
            ? modulePageHref(moduleRecord.slug)
            : undefined;

        return (
          <li key={moduleId} className="text-sm text-foreground">
            {href ? (
              <Link
                href={href}
                className="underline-offset-4 transition-colors hover:underline"
              >
                {label}
              </Link>
            ) : (
              label
            )}
          </li>
        );
      })}
    </ul>
  );
}

import Link from "next/link";
import { modelPageHref } from "@/lib/content/content-hrefs";
import {
  getModelById,
  getRegistryRecordById,
} from "@/lib/content/registry-runtime";

function uniqueModelIds(modelIds: string[]): string[] {
  return [...new Set(modelIds)];
}

export function ModelsUsingModule({ registryId }: { registryId: string }) {
  const record = getRegistryRecordById(registryId);
  if (record?.kind !== "module") {
    return null;
  }

  const modelIds = uniqueModelIds([
    ...record.usedByModelIds,
    ...record.exampleModelIds,
  ]).filter((modelId) => getModelById(modelId));

  if (modelIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No published example models are linked yet.
      </p>
    );
  }

  return (
    <ul className="my-4 space-y-2">
      {modelIds.map((modelId) => {
        const modelRecord = getModelById(modelId);
        const label =
          modelRecord?.aliases[0] ?? (modelRecord ? modelRecord.slug : modelId);
        const href = modelRecord ? modelPageHref(modelRecord.slug) : undefined;

        return (
          <li key={modelId} className="text-sm text-foreground">
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

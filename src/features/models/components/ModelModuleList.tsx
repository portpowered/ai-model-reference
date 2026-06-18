import Link from "next/link";
import { modulePageHref } from "@/lib/content/content-hrefs";
import { getModelById, getModuleById } from "@/lib/content/registry-runtime";

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ModelModuleList({ registryId }: { registryId: string }) {
  const record = getModelById(registryId);
  if (!record) {
    return null;
  }

  if (record.moduleIds.length === 0) {
    return (
      <p
        className="mt-4 text-sm text-muted-foreground"
        data-testid="model-module-list-empty"
      >
        No structured module list is available yet.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2" data-testid="model-module-list">
      {record.moduleIds.map((moduleId) => {
        const moduleRecord = getModuleById(moduleId);
        const slug = moduleRecord?.slug ?? moduleId.replace(/^module\./, "");
        const title =
          moduleRecord?.aliases[0] ??
          moduleRecord?.slug ??
          formatLabel(moduleId.replace(/^module\./, ""));

        return (
          <li key={moduleId}>
            <Link
              href={modulePageHref(slug)}
              className="text-sm text-foreground underline-offset-4 hover:underline"
            >
              {title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

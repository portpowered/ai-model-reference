import {
  type RegistryDeepLinkGroup,
  RegistryDeepLinkList,
} from "@/features/docs/components/RegistryDeepLinkList";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";

type RegistryAssociatedRecordsFieldGroup = Omit<
  RegistryDeepLinkGroup,
  "registryIds"
> & {
  fields: string[];
};

export function RegistryAssociatedRecords({
  registryId,
  groups,
}: {
  registryId: string;
  groups: RegistryAssociatedRecordsFieldGroup[];
}) {
  const record = getRegistryRecordById(registryId);
  if (!record) {
    return null;
  }

  const resolvedGroups: RegistryDeepLinkGroup[] = groups.map((group) => ({
    id: group.id,
    title: group.title,
    emptyLabel: group.emptyLabel,
    defaultOpen: group.defaultOpen,
    registryIds: uniqueRegistryIds(
      group.fields.flatMap((field) => readRegistryIds(record, field)),
    ),
  }));

  return <RegistryDeepLinkList groups={resolvedGroups} />;
}

function readRegistryIds(
  record: Record<string, unknown>,
  field: string,
): string[] {
  const value = record[field];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }
  return [];
}

function uniqueRegistryIds(values: string[]): string[] {
  return [...new Set(values)];
}

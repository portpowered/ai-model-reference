import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import { getModuleById } from "@/lib/content/registry-runtime";

export function ModelsUsingModule({ registryId }: { registryId: string }) {
  const record = getModuleById(registryId);

  if (!record) {
    return null;
  }

  const registryIds =
    record.usedByModelIds.length > 0
      ? record.usedByModelIds
      : record.exampleModelIds;

  return (
    <RegistryLinkList
      registryIds={registryIds}
      emptyLabel="No example models listed yet."
    />
  );
}

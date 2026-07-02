import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import { getModuleById } from "@/lib/content/registry-runtime";

export function ModelsUsingModule({ registryId }: { registryId: string }) {
  const record = getModuleById(registryId);
  if (!record || record.usedByModelIds.length === 0) {
    return null;
  }

  return <RegistryLinkList emptyLabel="" registryIds={record.usedByModelIds} />;
}

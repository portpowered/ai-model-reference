import { resolveCanonicalOntologyClassificationSelector } from "@/lib/content/ontology-classification-selectors";
import type { TopologyNavigationOption } from "@/lib/content/topology-navigation";

export function resolveTopologyNavigationOption(
  selector: string,
  options: readonly TopologyNavigationOption[],
): TopologyNavigationOption | undefined {
  const classification = resolveCanonicalOntologyClassificationSelector(
    selector,
    options.map((option) => option.tree.classification),
  );

  if (!classification) {
    return undefined;
  }

  return options.find(
    (option) => option.classificationId === classification.id,
  );
}

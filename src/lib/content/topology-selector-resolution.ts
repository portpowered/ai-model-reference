import { resolveCanonicalOntologyClassificationSelector } from "@/lib/content/ontology-classification-selectors";
import type { TopologyNavigationOption } from "@/lib/content/topology-navigation";
import { resolveTopologyCompatibilityClassificationId } from "@/lib/content/topology-selector-compatibility";

export function resolveTopologyNavigationOption(
  selector: string,
  options: readonly TopologyNavigationOption[],
): TopologyNavigationOption | undefined {
  const classification = resolveCanonicalOntologyClassificationSelector(
    selector,
    options.map((option) => option.tree.classification),
  );

  if (classification) {
    return options.find(
      (option) => option.classificationId === classification.id,
    );
  }

  const compatibilityClassificationId =
    resolveTopologyCompatibilityClassificationId(selector);

  if (!compatibilityClassificationId) {
    return undefined;
  }

  return options.find(
    (option) => option.classificationId === compatibilityClassificationId,
  );
}
